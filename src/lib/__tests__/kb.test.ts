import { describe, it, expect } from 'vitest';
import { retrievePassages, loadKb, splitIntoParagraphs } from '../kb';

// ── splitIntoParagraphs ──────────────────────────────────────────────────────

describe('splitIntoParagraphs', () => {
  it('splits on double newlines', () => {
    const kb = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const result = splitIntoParagraphs(kb);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('First paragraph.');
    expect(result[1]).toBe('Second paragraph.');
  });

  it('normalises \\r\\n line endings', () => {
    const kb = 'Paragraph A.\r\n\r\nParagraph B.';
    const result = splitIntoParagraphs(kb);
    expect(result).toHaveLength(2);
  });

  it('filters out short/empty chunks', () => {
    const kb = 'Real content here with enough text.\n\n   \n\nAnother real paragraph with enough text.';
    const result = splitIntoParagraphs(kb);
    expect(result.every((p) => p.length >= 20)).toBe(true);
  });

  it('returns empty array for blank input', () => {
    expect(splitIntoParagraphs('   ')).toEqual([]);
  });
});

// ── loadKb ───────────────────────────────────────────────────────────────────

describe('loadKb', () => {
  it('returns chunks for valid KB text', () => {
    const kb = `Our return policy allows returns within 30 days of purchase.

To initiate a return, contact support at support@example.com with your order number.

Refunds are processed within 5–7 business days after we receive the item.`;
    const chunks = loadKb(kb);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => typeof c === 'string' && c.length > 0)).toBe(true);
  });

  it('throws on empty string', () => {
    expect(() => loadKb('')).toThrow('empty');
  });

  it('throws on whitespace-only string', () => {
    expect(() => loadKb('   \n\n   ')).toThrow();
  });

  it('handles single-paragraph KB', () => {
    const kb = 'We are open Monday to Friday from 9am to 5pm.';
    const chunks = loadKb(kb);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(kb);
  });

  it('splits long paragraphs into multiple chunks', () => {
    // Construct a single-paragraph string longer than 800 chars
    const longParagraph = 'This is a sentence about our product. '.repeat(30);
    const chunks = loadKb(longParagraph);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 810)).toBe(true); // slight tolerance for sentence boundaries
  });
});

// ── retrievePassages ─────────────────────────────────────────────────────────

describe('retrievePassages', () => {
  const KB = `Our return policy allows returns within 30 days of purchase with a receipt.

To contact our support team, email support@example.com or call 1-800-555-0100.

Shipping takes 3–5 business days for standard delivery, or next-day for express.

We accept Visa, Mastercard, American Express, and PayPal.

Our store hours are Monday through Friday, 9am to 6pm, and Saturday 10am to 4pm.`;

  it('returns relevant passages for a specific question', () => {
    const passages = retrievePassages('How do I return a product?', KB);
    expect(passages.length).toBeGreaterThan(0);
    // The top passage should mention returns
    const topText = passages[0].text.toLowerCase();
    expect(topText).toContain('return');
  });

  it('returns at most 5 passages', () => {
    const passages = retrievePassages('tell me everything about your store', KB);
    expect(passages.length).toBeLessThanOrEqual(5);
  });

  it('returns passages with score between 0 and 1', () => {
    const passages = retrievePassages('What payment methods do you accept?', KB);
    for (const p of passages) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(1);
    }
  });

  it('each passage has text, score, and index fields', () => {
    const passages = retrievePassages('shipping time', KB);
    for (const p of passages) {
      expect(typeof p.text).toBe('string');
      expect(typeof p.score).toBe('number');
      expect(typeof p.index).toBe('number');
    }
  });

  it('returns empty array for empty KB', () => {
    const passages = retrievePassages('What are your hours?', '');
    expect(passages).toEqual([]);
  });

  it('returns empty array for whitespace-only KB', () => {
    const passages = retrievePassages('Hello?', '   \n\n  ');
    expect(passages).toEqual([]);
  });

  it('handles oversized KB gracefully (uses only valid content)', () => {
    // 40 000 chars of repeated content
    const bigKb = 'We ship to all 50 US states. '.repeat(1400);
    const passages = retrievePassages('Do you ship to Alaska?', bigKb);
    expect(passages.length).toBeGreaterThan(0);
    expect(passages.length).toBeLessThanOrEqual(5);
  });

  it('falls back to first passages when question has no keyword overlap', () => {
    // A question of only stop words will tokenise to nothing meaningful
    const passages = retrievePassages('the a an', KB);
    // Should still return passages (fallback to first TOP_K)
    expect(passages.length).toBeGreaterThan(0);
  });

  it('prioritises the most topically relevant passage', () => {
    const passages = retrievePassages('What credit cards do you accept?', KB);
    // Payments passage should rank first or second
    const found = passages.slice(0, 2).some((p) =>
      p.text.toLowerCase().includes('visa') || p.text.toLowerCase().includes('mastercard'),
    );
    expect(found).toBe(true);
  });
});
