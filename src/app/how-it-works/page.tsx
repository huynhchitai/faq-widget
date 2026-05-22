import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'How it works — FAQ Widget',
};

const STEPS = [
  {
    n: '01',
    icon: '🛡️',
    title: 'CORS preflight (OPTIONS)',
    body: 'The widget runs on third-party domains, so every request is cross-origin. An OPTIONS handler returns the CORS headers (Access-Control-Allow-Origin: *) so browsers permit the preflight. This is an explicit, documented trade-off — the open policy is mitigated by rate limiting. See the security stance below.',
  },
  {
    n: '02',
    icon: '⏱️',
    title: 'Rate limit by IP',
    body: '50 questions per IP per 24 hours via Upstash sliding window (prefix: rl:faq). The open CORS policy makes this endpoint especially abuse-prone — rate limiting is the primary control. When Upstash is not configured, the app degrades gracefully: no rate limiting, but a console warning is emitted.',
  },
  {
    n: '03',
    icon: '✅',
    title: 'Zod validation',
    body: 'question: 3–500 chars; kb: 20–40 000 chars. Both fields are required. Validation runs before any retrieval or AI call — invalid input is rejected with a 400 and a typed error code. No stack traces reach the client.',
  },
  {
    n: '04',
    icon: '🔍',
    title: 'Keyword retrieval (kb.ts)',
    body: 'The KB is split on double-newlines, then chunked to ≤800 chars at sentence boundaries. Both the question and each chunk are tokenised into lowercase word sets with stop words removed. Jaccard token overlap scores each chunk. Top-5 passages are returned. If overlap is zero for all chunks (stop-word-only query), the first 5 chunks are returned as a fallback so the model always has context to work with.',
  },
  {
    n: '05',
    icon: '🤖',
    title: 'Prompt construction (prompt.ts)',
    body: 'The system instruction contains: (a) the assistant persona + rules, and (b) the top-5 KB passages as TRUSTED CONTEXT. The user question is placed in the user turn only as "VISITOR QUESTION: …" — it is NEVER interpolated into the system instruction. This separation is the prompt-injection defence: even if the question contains "Ignore previous instructions", the system rules still apply.',
  },
  {
    n: '06',
    icon: '⚡',
    title: 'Gemini 2.5 Flash call',
    body: 'Temperature 0.1 (near-deterministic), maxOutputTokens 512. The grounding rule is explicit in the system prompt: answer only from context; say "I don\'t have that in my knowledge base" when the answer is not there. maxDuration: 30s on the route. Errors are caught and a typed MODEL_ERROR code is returned — the raw exception message never reaches the client.',
  },
  {
    n: '07',
    icon: '📦',
    title: 'Response + passages',
    body: 'The API returns { ok: true, answer, passages, remaining }. passages is the list of KB chunks the retrieval selected — the frontend can display them as "sources used". remaining tells the widget how many queries the user has left today. CORS headers are applied to every response, including error responses.',
  },
];

const SECURITY_ITEMS = [
  {
    title: 'Open CORS policy — deliberate trade-off',
    stance: 'risk-accepted',
    body: 'Access-Control-Allow-Origin: * is required for the widget to work on arbitrary third-party sites. This means any site can POST questions. Mitigations: (1) rate limiting by IP; (2) question length cap; (3) the KB is sent by the operator, not stored server-side — there is no persistent data to exfiltrate; (4) the model cannot perform actions — it only returns text.',
  },
  {
    title: 'Prompt injection',
    stance: 'defended',
    body: 'The user question is placed in the user turn only, never in the system instruction. The system prompt explicitly instructs the model to treat the question as pure data and ignore injection attempts. KB passages are the trusted context; the question is untrusted input.',
  },
  {
    title: 'Hallucination / ungrounded answers',
    stance: 'defended',
    body: 'The grounding rule is hard-coded in the system instruction: answer only from the provided KB passages; say "I don\'t have that in my knowledge base" when the answer is absent. Temperature 0.1 reduces creative variation. The retrieval fallback (first 5 chunks when overlap = 0) ensures the model always has context to evaluate against.',
  },
  {
    title: 'Rate limiting / abuse',
    stance: 'defended',
    body: '50 questions per IP per day via Upstash Redis sliding window. Graceful no-op when Upstash is not configured — but deploying without Redis in production is a known gap that must be documented and accepted by the operator.',
  },
  {
    title: 'Input validation',
    stance: 'defended',
    body: 'Zod validates both inputs at the API boundary. question: 3–500 chars. kb: 20–40 000 chars. Oversized requests are rejected before the retrieval and model calls.',
  },
  {
    title: 'No server-side KB storage',
    stance: 'defended',
    body: 'The KB is sent with every request and never persisted server-side. There is no database to breach. The operator\'s KB content is in transit only — protected by TLS.',
  },
  {
    title: 'No stack traces to client',
    stance: 'defended',
    body: 'All errors are returned as typed { ok: false, error: AskErrorCode, message } objects. Raw exception messages and stack traces are logged server-side only.',
  },
  {
    title: 'Sandboxed iframe',
    stance: 'defended',
    body: 'embed.js creates the iframe with sandbox="allow-scripts allow-same-origin". allow-same-origin is needed for the /api/ask fetch; allow-scripts is needed for React. The parent page cannot access the iframe\'s DOM cross-origin. The KB is passed via postMessage, not URL query params, to avoid it appearing in server/referrer logs.',
  },
  {
    title: 'No Redis in production',
    stance: 'gap',
    body: 'If UPSTASH_REDIS_REST_* is not configured, rate limiting silently becomes a no-op. The app logs a warning, but operators must configure Redis before exposing this to the open web. This is a deployment responsibility gap, not a code gap.',
  },
  {
    title: 'KB confidentiality in transit',
    stance: 'gap',
    body: 'The KB is sent with every API request. On production HTTPS deployments this is TLS-protected. On HTTP deployments (local dev, misconfigured prod) the KB content is visible in transit. The embed.js snippet passes KB via postMessage, not URL params, reducing exposure in logs.',
  },
];

export default function HowItWorks() {
  return (
    <>
      <NavBar here="how" />

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        {/* Header */}
        <header className="mb-14 animate-fade-up">
          <span className="eyebrow">Engineering notes</span>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,7vw,4.5rem)] font-bold leading-[1.05] text-ink">
            How the FAQ Widget <span className="text-coral">actually works.</span>
          </h1>
          <p className="mt-4 font-body text-lg leading-relaxed text-ink-soft max-w-3xl">
            One Next.js deploy. No vector database. No embedding model. A small keyword
            retrieval algorithm, a strictly grounded Gemini prompt, and a sandboxed iframe.
            Below: every step of the pipeline, the security decisions, and the gaps that
            are honestly disclosed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn-ghost !py-2 !px-5 !text-sm">
              ← back to playground
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left: pipeline steps */}
          <div>
            <span className="eyebrow">Pipeline — step by step</span>
            <h2 className="mt-2 mb-8 font-display text-2xl font-bold text-ink sm:text-3xl">
              From question to grounded answer.
            </h2>

            <ol className="flex flex-col gap-6">
              {STEPS.map((s) => (
                <li
                  key={s.n}
                  className="card-static flex gap-5 animate-fade-up"
                >
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span className="font-display text-2xl" aria-hidden>{s.icon}</span>
                    <span
                      className="font-mono text-xs font-bold"
                      style={{ color: 'var(--coral)' }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink mb-1">{s.title}</h3>
                    <p className="font-body text-sm leading-relaxed text-ink-soft">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* ASCII pipeline diagram */}
            <div className="mt-12">
              <span className="eyebrow">At a glance</span>
              <h2 className="mt-2 mb-6 font-display text-2xl font-bold text-ink">
                ASCII pipeline diagram.
              </h2>
              <div className="overflow-x-auto">
                <pre className="code-box text-[11px] leading-relaxed">
{`POST /api/ask  { question, kb }
       │
       ├─── OPTIONS preflight ──▶ CORS headers (204)
       │
       ▼
 ┌─────────────────────────────────────────────────┐
 │  1. Rate limit                                  │
 │     Upstash sliding window · 50/IP/day          │
 │     prefix: rl:faq                              │
 │     no-op (warn) if Redis not configured        │
 └──────────────────────┬──────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────┐
 │  2. Zod validate                                │
 │     question: 3–500 chars                       │
 │     kb:       20–40 000 chars                   │
 └──────────────────────┬──────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────┐
 │  3. Keyword retrieval  (kb.ts)                  │
 │                                                 │
 │  kb ──▶ split paragraphs ──▶ chunk (≤800 chars) │
 │                                                 │
 │  question ──▶ tokenise ──▶ stop-word filter     │
 │                                                 │
 │  ∀ chunk: Jaccard overlap score                 │
 │  sort desc ──▶ top-5 passages                   │
 │  fallback: first-5 when all scores = 0          │
 └──────────────────────┬──────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────┐
 │  4. Build prompt  (prompt.ts)                   │
 │                                                 │
 │  system instruction:                            │
 │    · persona + grounding rules                  │
 │    · KB passages  ← TRUSTED CONTEXT             │
 │                                                 │
 │  user turn:                                     │
 │    "VISITOR QUESTION: {question}"               │
 │                       ↑ UNTRUSTED DATA          │
 │                                                 │
 │  Separation = prompt-injection defence          │
 └──────────────────────┬──────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────┐
 │  5. Gemini 2.5 Flash                            │
 │     temp 0.1 · maxOutputTokens 512              │
 │                                                 │
 │     grounding rule in system prompt:            │
 │     "answer ONLY from context;                  │
 │      say 'I don't have that in my KB'           │
 │      if answer not found"                       │
 └──────────────────────┬──────────────────────────┘
                        │
                        ▼
 { ok: true, answer, passages, remaining }
 + CORS headers on every response`}
                </pre>
              </div>
            </div>
          </div>

          {/* Right: security sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="sticky top-24">
              <span className="eyebrow">Security stance</span>
              <h2 className="mt-2 mb-6 font-display text-xl font-bold text-ink">
                What&rsquo;s defended, what&rsquo;s not.
              </h2>

              <div className="flex flex-col gap-4">
                {SECURITY_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: item.stance === 'defended'
                        ? 'rgba(76, 175, 125, 0.3)'
                        : item.stance === 'risk-accepted'
                        ? 'rgba(232, 97, 58, 0.35)'
                        : 'rgba(234, 179, 8, 0.4)',
                      background: item.stance === 'defended'
                        ? 'rgba(76, 175, 125, 0.06)'
                        : item.stance === 'risk-accepted'
                        ? 'rgba(232, 97, 58, 0.05)'
                        : 'rgba(234, 179, 8, 0.06)',
                    }}
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      <span className="text-sm" aria-hidden>
                        {item.stance === 'defended' ? '✅' : item.stance === 'risk-accepted' ? '⚠️' : '🔶'}
                      </span>
                      <h4 className="font-display text-sm font-bold text-ink leading-tight">
                        {item.title}
                      </h4>
                    </div>
                    <p className="font-body text-xs leading-relaxed text-ink-soft pl-6">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Design note */}
        <section
          className="mt-16 rounded-3xl p-8 border border-widget-border animate-fade-up"
          style={{ background: 'var(--parchment)' }}
        >
          <span className="eyebrow">Design notes</span>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink">
            Why no embeddings?
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                title: 'Simplicity',
                body: 'Keyword retrieval needs zero infrastructure. No vector database, no embedding API, no chunking pipeline. The KB is processed in-memory per request. For FAQs (short, well-scoped questions), keyword overlap is highly competitive with semantic similarity.',
              },
              {
                title: 'Latency',
                body: 'Keyword scoring over a 40k-char KB takes ~5ms. An embedding call adds 100–500ms and a vector DB lookup adds more. For a widget that must feel instant, in-memory retrieval wins.',
              },
              {
                title: 'Cost',
                body: 'No embedding API means no per-call embedding cost. The only variable cost is the Gemini generation call — ~$0.0003 per question at Gemini 2.5 Flash pricing. For a widget doing 50 questions/IP/day this is negligible.',
              },
            ].map((note) => (
              <div key={note.title}>
                <h3 className="font-display text-base font-bold text-ink mb-2">{note.title}</h3>
                <p className="font-body text-sm leading-relaxed text-ink-soft">{note.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between
                            rounded-3xl border border-widget-border p-8 bg-white/60 animate-fade-up">
          <div>
            <span className="eyebrow">Want this for your site?</span>
            <h3 className="mt-2 font-display text-2xl font-bold text-ink">
              Get an embeddable FAQ widget for your product.
            </h3>
            <p className="mt-2 font-body text-sm text-ink-soft max-w-xl">
              This is a portfolio demo — the architecture is the real client build. If you have
              a support knowledge base and want a drop-in AI FAQ widget, get in touch.
            </p>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <a
              href="mailto:huynhchitai.070306@gmail.com?subject=FAQ%20Widget%20enquiry"
              className="btn-coral"
            >
              Email me →
            </a>
            <Link href="/" className="btn-ghost !text-sm !py-2">
              ← playground
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-widget-border bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3
                        px-6 py-6 sm:flex-row sm:items-center sm:px-10">
          <p className="font-body text-xs text-ink-quiet">
            Tai Huynh · 2026 · FAQ Widget · Portfolio Project #5 · Next.js 14 &amp; Vertex AI
          </p>
          <p className="font-body text-xs text-ink-quiet">
            <a href="https://github.com/0CCHacker" className="hover:text-coral transition-colors">Tai Huynh</a>
            <span className="mx-2 opacity-30">·</span>
            <a href="https://github.com/0CCHacker" className="hover:text-coral transition-colors">github</a>
            <span className="mx-2 opacity-30">·</span>
            <a href="mailto:huynhchitai.070306@gmail.com" className="hover:text-coral transition-colors">email</a>
          </p>
        </div>
      </footer>
    </>
  );
}
