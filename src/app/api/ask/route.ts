import { NextRequest, NextResponse } from 'next/server';
import { askRequestSchema } from '@/lib/schema';
import { retrievePassages } from '@/lib/kb';
import { buildSystemInstruction, buildUserTurn, MAX_OUTPUT_TOKENS } from '@/lib/prompt';
import { getVertex, MODEL_ID } from '@/lib/vertex';
import { checkRate, getClientIp } from '@/lib/ratelimit';
import { corsHeaders, handleOptions } from '@/lib/cors';
import type { AskResponse, AskErrorCode } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/** Handle CORS preflight — required for cross-origin widget embeds. */
export function OPTIONS() {
  return handleOptions();
}

export async function POST(req: NextRequest) {
  // ── Rate limit by IP ────────────────────────────────────────────────────
  // This endpoint is exposed to the open web (CORS: *). Rate limiting is the
  // primary abuse-prevention control. See SECURITY.md for the full threat model.
  const ip = getClientIp(req);
  const rate = await checkRate(ip);
  if (!rate.ok) {
    return errResponse('RATE_LIMIT', `Rate limit exceeded (${rate.limit}/day). Try again later.`, 429);
  }

  // ── Parse + validate body ───────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errResponse('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
  }

  const parsed = askRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join('; ');
    return errResponse('VALIDATION_ERROR', `Invalid request: ${msg}`, 400);
  }

  const { question, kb } = parsed.data;

  // ── Retrieve relevant KB passages ───────────────────────────────────────
  // Simple keyword-overlap retrieval. No embeddings required — fast and free.
  // The question is treated as pure data here, not trusted for logic control.
  const passages = retrievePassages(question, kb);

  if (passages.length === 0) {
    // This should not normally happen given the zod min-length on kb,
    // but we handle it gracefully rather than sending an empty context to the model.
    const noKbResponse: AskResponse = {
      ok: true,
      answer: "I don't have that in my knowledge base.",
      passages: [],
      remaining: rate.remaining,
    };
    return okResponse(noKbResponse);
  }

  // ── Call Gemini 2.5 Flash ───────────────────────────────────────────────
  // System instruction contains the KB passages (trusted context).
  // The user question is in the user turn only (untrusted data).
  const systemInstruction = buildSystemInstruction(passages);
  const userTurn = buildUserTurn(question);

  try {
    const vertex = getVertex();
    const model = vertex.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.1, // Low temperature = grounded, deterministic answers
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }],
      },
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: userTurn }],
        },
      ],
    });

    const candidate = result.response?.candidates?.[0];
    const answer =
      candidate?.content?.parts
        ?.map((p) => ('text' in p ? p.text : ''))
        .join('')
        .trim() ?? '';

    if (!answer) {
      return errResponse('MODEL_ERROR', 'The model returned an empty response. Please try again.', 502);
    }

    const successResponse: AskResponse = {
      ok: true,
      answer,
      passages: passages.map((p) => ({
        text: p.text,
        score: p.score,
        index: p.index,
      })),
      remaining: rate.remaining,
    };

    return okResponse(successResponse);
  } catch (err) {
    // Never expose stack traces or internal error details to the client.
    const detail = err instanceof Error ? err.message : 'unknown';
    console.error('[api/ask] model error:', detail);
    return errResponse('MODEL_ERROR', 'The AI service encountered an error. Please try again.', 502);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function okResponse(body: AskResponse): NextResponse {
  const res = NextResponse.json(body);
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function errResponse(code: AskErrorCode, message: string, status: number): NextResponse {
  const body: AskResponse = { ok: false, error: code, message };
  const res = NextResponse.json(body, { status });
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
