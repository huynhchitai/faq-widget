# FAQ Widget

Paste a knowledge base, get an AI FAQ assistant that embeds on any site with one `<script>` tag.

> Portfolio Project #5 — [Tai Huynh](https://github.com/huynhchitai)

---

## Demo

Best demo inputs:

```
Knowledge base:
  We offer three plans: Starter ($9/mo), Pro ($29/mo), and Enterprise (custom).
  The Starter plan includes 3 projects and 5 GB storage.
  Cancel any time from Account > Billing.
  We accept Visa, Mastercard, and PayPal via Stripe.
  Support: Monday–Friday 9am–6pm ET at support@example.com.

Try asking:
  • "What are your plans?"
  • "How do I cancel?"
  • "Do you offer refunds?"         ← not in KB → "I don't have that in my knowledge base"
  • "What is your SSN policy?"      ← not in KB → grounded refusal
```

The playground at `/` lets you edit the KB live and immediately test the widget.

---

## Stack

- **Framework** — Next.js 14, App Router, `src/` layout
- **Language** — TypeScript `strict: true`
- **Styling** — Tailwind CSS 3 + CSS variables; fonts: Baloo 2 (display), Mulish (body), JetBrains Mono (code)
- **AI** — Vertex AI Gemini 2.5 Flash (`@google-cloud/vertexai`)
- **Validation** — zod 4 on every API input
- **Rate limiting** — Upstash Redis (`@upstash/ratelimit`), graceful no-op when unconfigured
- **Tests** — Vitest
- **Deploy** — Vercel

---

## Run locally

```bash
pnpm install
cp .env.example .env.local
# fill in GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS (or _JSON)
# fill in UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (optional, for rate limiting)
# set NEXT_PUBLIC_BASE_URL=http://localhost:3000
pnpm dev
```

Visit `http://localhost:3000`.

---

## Tests

```bash
pnpm test
```

Covers `src/lib/kb.ts` — the security-critical retrieval module:

- `splitIntoParagraphs` — double-newline splitting, CRLF normalisation, short-chunk filtering
- `loadKb` — error on empty input, single-paragraph passthrough, long-paragraph chunking
- `retrievePassages` — relevant passage rises to top, at-most-5 cap, 0–1 score range, empty/oversize KB handling, fallback when no keyword overlap

---

## Pipeline at a glance

```
POST /api/ask  { question: string, kb: string }
       │
       ├── OPTIONS ──▶ CORS headers 204
       │
       ▼
 Rate limit  (Upstash, 50/IP/day, prefix: rl:faq)
       │
       ▼
 Zod validate  (question: 3–500, kb: 20–40k chars)
       │
       ▼
 Keyword retrieval  (kb.ts)
   kb ──▶ split paragraphs ──▶ chunk ≤800 chars
   question ──▶ tokenise + stop-word filter
   Jaccard overlap score per chunk
   → top-5 passages  (fallback: first-5 if all scores = 0)
       │
       ▼
 Build prompt  (prompt.ts)
   system: persona + rules + KB passages  ← TRUSTED CONTEXT
   user:   "VISITOR QUESTION: ..."        ← UNTRUSTED DATA
       │
       ▼
 Gemini 2.5 Flash  (temp 0.1, max 512 tokens)
   grounding rule: answer ONLY from context
   "I don't have that in my knowledge base" when not found
       │
       ▼
 { ok: true, answer, passages, remaining }
 + CORS headers on every response
```

---

## Security stance

### Defended

| Threat | Control |
|---|---|
| Prompt injection | User question in user turn only; never in system instruction |
| Hallucination | Explicit grounding rule + low temperature; model instructed to admit ignorance |
| Abuse (open CORS) | Rate limit 50/IP/day; question length cap 500 chars |
| Input malformed data | Zod validation on all fields before any AI call |
| Stack traces to client | All errors returned as typed codes; exceptions logged server-side only |
| Iframe privilege escalation | embed.js sandbox: `allow-scripts allow-same-origin` only |
| KB in URL logs | KB passed via postMessage, not URL query params |

### Known gaps / honest disclosures

**Open CORS policy** — `Access-Control-Allow-Origin: *` is required for the widget to work on arbitrary sites. This means any origin can POST questions. This is an accepted trade-off: the endpoint has no persistent state to exfiltrate, no write capabilities, and rate limiting is the primary abuse control. If you are deploying with a fixed set of known domains, narrow the CORS allowlist in `src/lib/cors.ts`.

**No Redis in production** — If `UPSTASH_REDIS_REST_*` is not set, rate limiting is silently disabled. The app logs a warning. Deploying without Redis on a public endpoint is a configuration gap the operator must address.

**KB confidentiality** — The KB text is sent with every API request. On HTTPS deployments this is TLS-protected. The embed.js script avoids URL query params for the KB to reduce exposure in access logs, but the KB still appears in the POST body. Operators should not put highly sensitive data in a KB exposed to a public widget.

**IP-based rate limiting** — IPv6 /64 prefix blocking is not implemented. A sophisticated attacker can rotate IPs. The limit is a cost control, not a hard security boundary.

**No Vitest spec for prompt.ts** — The prompt builder is pure string construction; testing it with mocked AI output is brittle. The KB retrieval (which affects grounding) is fully tested in `kb.test.ts`.

---

## Known limits

- Retrieval is keyword overlap (Jaccard), not semantic similarity. Questions phrased very differently from the KB wording may retrieve less relevant passages. Semantic embedding retrieval is the upgrade path for larger KBs.
- The KB is stateless per request — no caching between calls. For large KBs (close to 40k chars), the chunking and scoring runs on every request. Sub-10ms for typical sizes; tolerable for a demo.
- `maxOutputTokens: 512` — answers over ~400 words will be truncated.
- The Gemini call has a hard 30-second route timeout. Very slow model responses (network issues) will return a 502.
