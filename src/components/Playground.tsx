'use client';

import { useState, useRef, useCallback } from 'react';
import type { AskResponse, Passage } from '@/lib/types';

const DEFAULT_KB = `We offer three plans: Starter ($9/mo), Pro ($29/mo), and Enterprise (custom pricing).

The Starter plan includes up to 3 projects, 5 GB storage, and email support. The Pro plan includes unlimited projects, 50 GB storage, priority email support, and API access. Enterprise includes everything in Pro plus SSO, SLA guarantees, and a dedicated account manager.

You can cancel your subscription at any time from the Account > Billing page. Cancellations take effect at the end of the current billing period — you keep access until then. We do not offer pro-rated refunds for mid-cycle cancellations.

We accept Visa, Mastercard, American Express, and PayPal. All transactions are processed securely via Stripe. We do not store your full card details.

To reset your password, click "Forgot password?" on the sign-in page and we'll email you a reset link. The link expires after 1 hour.

Our support team is available Monday–Friday, 9am–6pm Eastern. You can reach us at support@example.com. Pro and Enterprise customers get responses within 4 business hours; Starter within 2 business days.`;

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  passages?: Passage[];
  error?: boolean;
}

export default function Playground() {
  const [kb, setKb] = useState(DEFAULT_KB);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const embedSnippet = `<script src="${baseUrl}/embed.js" data-widget-url="${baseUrl}/widget"></script>`;

  const handleAsk = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, kb }),
      });

      const data: AskResponse = await res.json();

      if (!data.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: data.message, error: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: data.answer, passages: data.passages },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Network error. Please check your connection.', error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [input, kb, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked in some iframes — no-op */
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Left: KB editor */}
      <div className="flex flex-col gap-4 animate-fade-up reveal-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Knowledge Base</span>
          <span className="badge">{kb.length.toLocaleString()} / 40 000 chars</span>
        </div>
        <p className="font-body text-sm text-ink-quiet">
          Paste your FAQ content, product docs, or support text. The AI will answer
          <strong className="text-ink"> only</strong> from this text.
        </p>
        <textarea
          className="field-textarea h-72 leading-relaxed"
          value={kb}
          onChange={(e) => setKb(e.target.value)}
          placeholder="Paste your knowledge base here…"
          maxLength={40000}
          aria-label="Knowledge base text"
        />

        {/* Embed snippet */}
        <div className="rounded-2xl border border-widget-border bg-white/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-sm font-semibold text-ink">Embed snippet</span>
            <button
              onClick={handleCopySnippet}
              className={`btn-ghost !py-1.5 !px-4 !text-xs transition-all ${copied ? '!border-grass !text-grass' : ''}`}
              aria-label="Copy embed snippet"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <div className="code-box">
            <code>{embedSnippet}</code>
          </div>
          <p className="mt-2 font-body text-xs text-ink-quiet">
            Drop this tag before &lt;/body&gt; on any page. The widget opens as a floating button.
          </p>
        </div>
      </div>

      {/* Right: Chat preview */}
      <div className="flex flex-col gap-4 animate-fade-up reveal-4">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Live Preview</span>
          <span className="badge">Playground</span>
        </div>
        <p className="font-body text-sm text-ink-quiet">
          Ask a question to test your knowledge base in real time.
        </p>

        {/* Chat window */}
        <div className="card-static flex flex-col h-[420px] overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-widget-border pb-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-deep shadow-pillowy-sm">
              <span className="font-display text-sm font-bold text-white" aria-hidden>?</span>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-ink">FAQ Assistant</p>
              <p className="font-body text-xs text-ink-quiet">Grounded in your knowledge base</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-grass animate-pulse" />
              <span className="font-body text-xs text-ink-quiet">Ready</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="text-3xl" aria-hidden>💬</div>
                <p className="font-display text-sm font-semibold text-ink-soft">
                  Ask anything about your KB
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['What are your plans?', 'How do I cancel?', 'What payment methods?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="rounded-pill border border-widget-border bg-parchment px-3 py-1.5
                                 font-body text-xs text-ink-soft hover:bg-blush hover:text-coral
                                 transition-colors duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="bubble-user">{msg.text}</div>
                ) : (
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div className={`bubble-bot ${msg.error ? 'border-red-200 bg-red-50 text-red-700' : ''}`}>
                      {msg.text}
                    </div>
                    {msg.passages && msg.passages.length > 0 && (
                      <details className="font-body text-xs text-ink-quiet">
                        <summary className="cursor-pointer hover:text-coral transition-colors">
                          {msg.passages.length} source passage{msg.passages.length > 1 ? 's' : ''} used
                        </summary>
                        <div className="mt-1 flex flex-col gap-1 pl-2 border-l-2 border-coral/30">
                          {msg.passages.slice(0, 3).map((p, pi) => (
                            <p key={pi} className="line-clamp-2 text-xs text-ink-quiet">
                              {p.text.slice(0, 120)}…
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bubble-bot">
                  <div className="dot-loader">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="mt-3 flex gap-2 border-t border-widget-border pt-3">
            <input
              type="text"
              className="field-input flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              disabled={loading}
              maxLength={500}
              aria-label="Your question"
            />
            <button
              onClick={handleAsk}
              disabled={loading || !input.trim()}
              className="btn-coral !px-4 !py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              aria-label="Send question"
            >
              {loading ? '…' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
