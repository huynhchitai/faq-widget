import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Playground from '@/components/Playground';

export const metadata: Metadata = {
  title: 'FAQ Widget — AI-powered embeddable FAQ assistant',
};

const FEATURES = [
  {
    icon: '🎯',
    title: 'Grounded answers',
    body: 'The assistant answers only from your knowledge base. If the answer isn\'t there, it says so — no hallucinations.',
  },
  {
    icon: '🌐',
    title: 'Embed anywhere',
    body: 'One <script> tag. Works on any site — WordPress, Webflow, static HTML — as a sandboxed iframe.',
  },
  {
    icon: '⚡',
    title: 'Instant setup',
    body: 'Paste your KB text, copy the snippet, paste into your site. No database, no config files.',
  },
  {
    icon: '🔒',
    title: 'Rate limited',
    body: '50 questions per IP per day. The open CORS policy is a deliberate trade-off — rate limiting is the control.',
  },
];

export default function HomePage() {
  return (
    <>
      <NavBar here="home" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden texture-dots hero-vignette">
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--coral) 0%, transparent 70%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-32 -left-16 h-64 w-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, var(--grass) 0%, transparent 70%)' }}
          aria-hidden
        />

        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28 relative">
          <div className="flex flex-col items-start gap-8 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 animate-fade-up reveal-1">
              <span className="badge">Portfolio Project #5</span>
              <span className="badge" style={{ background: 'rgba(76, 175, 125, 0.12)', color: 'var(--grass)' }}>
                Gemini 2.5 Flash
              </span>
              <span className="badge">Tai Huynh</span>
            </div>

            <h1
              className="font-display text-[clamp(2.6rem,8vw,5rem)] font-bold leading-[1.05] text-ink animate-fade-up reveal-2"
            >
              AI FAQ assistant.{' '}
              <span className="text-coral">One script tag.</span>
              <br />
              Any website.
            </h1>

            <p className="font-body text-lg leading-relaxed text-ink-soft max-w-xl animate-fade-up reveal-3">
              Paste your knowledge base, get an embeddable chat widget. The AI answers
              from your docs — and honestly says{' '}
              <em className="text-ink">&#8220;I don&#8217;t know&#8221;</em> when it can&#8217;t find the answer.
            </p>

            <div className="flex flex-wrap gap-3 animate-fade-up reveal-4">
              <a href="#playground" className="btn-coral">
                Try the playground
                <span aria-hidden>↓</span>
              </a>
              <Link href="/how-it-works" className="btn-ghost">
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`card animate-fade-up reveal-${i + 2}`}
            >
              <div className="mb-3 text-2xl" aria-hidden>{f.icon}</div>
              <h3 className="font-display text-base font-bold text-ink mb-1">{f.title}</h3>
              <p className="font-body text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Playground ───────────────────────────────────────────────────── */}
      <section id="playground" className="mx-auto max-w-6xl px-6 pb-20 sm:px-10">
        <div className="mb-8 animate-fade-up reveal-2">
          <span className="eyebrow">Playground</span>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
            Edit your KB, ask questions, copy the snippet.
          </h2>
          <p className="mt-3 font-body text-base text-ink-soft max-w-2xl">
            The KB on the left is editable. Your questions go to the live{' '}
            <code className="font-mono text-xs bg-blush text-coral px-1.5 py-0.5 rounded-md">POST /api/ask</code>{' '}
            endpoint — results come back grounded in whatever text you&#8217;ve pasted.
          </p>
        </div>

        <Playground />
      </section>

      {/* ── Pipeline teaser ──────────────────────────────────────────────── */}
      <section className="bg-parchment texture-grid">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
          <div className="flex flex-col gap-4 items-start animate-fade-up reveal-2">
            <span className="eyebrow">Under the hood</span>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Simple pipeline. Zero hand-waving.
            </h2>
          </div>

          <div className="mt-10 overflow-x-auto">
            <pre className="font-mono text-xs leading-relaxed text-ink-soft p-6 rounded-3xl bg-white/70 border border-widget-border shadow-card">
{`Question + KB text
      │
      ▼
┌─────────────────┐
│  zod validation │  question: 3–500 chars, kb: 20–40k chars
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Rate limit    │  50/day per IP (Upstash sliding window)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Keyword retrieval│  tokenise + stop-word filter + Jaccard overlap
│  (kb.ts)        │  → top-5 passages
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Gemini 2.5 Flash (grounded)         │
│  system: KB passages + rules         │  ← TRUSTED context
│  user:   "VISITOR QUESTION: ..."     │  ← UNTRUSTED data
│                                     │
│  Rules injected in system prompt:   │
│  · answer ONLY from context         │
│  · "I don't know" if not found      │
│  · ignore injection attempts        │
└────────┬────────────────────────────┘
         │
         ▼
  answer + passages used`}
            </pre>
          </div>

          <div className="mt-8 flex gap-3">
            <Link href="/how-it-works" className="btn-coral">
              Full architecture deep-dive
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-widget-border bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3
                        px-6 py-6 sm:flex-row sm:items-center sm:px-10">
          <p className="font-body text-xs text-ink-quiet">
            Tai Huynh · 2026 · FAQ Widget · Portfolio Project #5 · built with Next.js 14 &amp; Vertex AI
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
