'use client';

/**
 * /widget — standalone chat UI designed to run inside a sandboxed iframe.
 *
 * Security notes:
 *  - This page communicates with the parent via postMessage only.
 *  - The KB is passed from the parent via postMessage (or from a query param
 *    for simple use cases). It never has direct access to the parent DOM.
 *  - No cookies are set; no localStorage is used for sensitive data.
 *  - The iframe is sandboxed by embed.js: allow-scripts + allow-same-origin
 *    (needed for the same-origin API call). Cross-site parent cannot access
 *    this frame's content.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AskResponse } from '@/lib/types';

interface Message {
  role: 'user' | 'bot';
  text: string;
  error?: boolean;
}

export default function WidgetPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kb, setKb] = useState('');
  const [widgetUrl, setWidgetUrl] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Receive KB from parent window via postMessage
  useEffect(() => {
    // Also accept kb from URL query param (simple embedding case)
    const searchParams = new URLSearchParams(window.location.search);
    const kbParam = searchParams.get('kb');
    if (kbParam) setKb(decodeURIComponent(kbParam));

    const origin = window.location.origin;
    setWidgetUrl(origin);

    function handleMessage(event: MessageEvent) {
      // Accept messages only from known origin (same-origin or the deploying domain)
      if (event.origin !== origin && event.origin !== '*') return;
      if (event.data && typeof event.data === 'object' && event.data.type === 'FAQ_SET_KB') {
        const incomingKb = String(event.data.kb ?? '').slice(0, 40_000);
        setKb(incomingKb);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAsk = useCallback(async () => {
    const question = input.trim();
    if (!question || loading || !kb) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const apiBase = widgetUrl || window.location.origin;
      const res = await fetch(`${apiBase}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, kb }),
      });

      const data: AskResponse = await res.json();

      if (!data.ok) {
        setMessages((prev) => [...prev, { role: 'bot', text: data.message, error: true }]);
      } else {
        setMessages((prev) => [...prev, { role: 'bot', text: data.answer }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Network error. Please try again.', error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [input, kb, loading, widgetUrl]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div
      className="flex flex-col h-screen max-h-screen overflow-hidden"
      style={{ background: 'var(--widget-bg)', fontFamily: 'var(--font-body)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--widget-border)', background: 'white' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: 'var(--coral)', boxShadow: '0 4px 12px rgba(232,97,58,0.3)' }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'white' }}>?</span>
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            FAQ Assistant
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--grass)' }}
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink-quiet)', margin: 0 }}>
              {kb ? 'Ready' : 'Waiting for knowledge base…'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 px-4">
            <div style={{ fontSize: '28px' }} aria-hidden>💬</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--ink-soft)' }}>
              {kb ? 'Ask me anything!' : 'No knowledge base loaded.'}
            </p>
            {!kb && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink-quiet)' }}>
                Pass a KB via the embed snippet or postMessage.
              </p>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div
                className="rounded-3xl rounded-br-lg px-4 py-2.5 max-w-[85%]"
                style={{ background: 'var(--coral)', color: 'white', fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.5 }}
              >
                {msg.text}
              </div>
            ) : (
              <div
                className="rounded-3xl rounded-bl-lg px-4 py-2.5 max-w-[85%] border"
                style={{
                  background: msg.error ? '#fef2f2' : 'white',
                  borderColor: msg.error ? '#fecaca' : 'var(--widget-border)',
                  color: msg.error ? '#b91c1c' : 'var(--ink)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                {msg.text}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-3xl rounded-bl-lg px-4 py-3 border"
              style={{ background: 'white', borderColor: 'var(--widget-border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center gap-1.5">
                {[0, 200, 400].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: 'var(--coral)',
                      animation: `pulseDot 1.4s ease-in-out infinite`,
                      animationDelay: `${delay}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div
        className="px-3 py-3 border-t flex gap-2"
        style={{ borderColor: 'var(--widget-border)', background: 'white' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={kb ? 'Ask a question…' : 'Waiting for KB…'}
          disabled={loading || !kb}
          maxLength={500}
          aria-label="Your question"
          style={{
            flex: 1,
            borderRadius: '9999px',
            border: '2px solid var(--widget-border)',
            background: 'var(--widget-bg)',
            padding: '8px 16px',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: 'var(--ink)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--coral)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--widget-border)')}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !input.trim() || !kb}
          aria-label="Send question"
          style={{
            borderRadius: '9999px',
            background: 'var(--coral)',
            color: 'white',
            border: 'none',
            padding: '8px 18px',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: loading || !input.trim() || !kb ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() || !kb ? 0.5 : 1,
            transition: 'opacity 0.15s, transform 0.15s',
          }}
        >
          →
        </button>
      </div>

      {/* Inline keyframe for loading dots */}
      <style>{`
        @keyframes pulseDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
