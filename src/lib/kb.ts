import type { Passage } from './types';

/**
 * Maximum number of passages to surface to the model.
 * Keeping this small ensures the prompt is focused and reduces hallucination risk.
 */
const TOP_K = 5;

/**
 * Maximum characters per passage chunk.
 * Chunks are split on paragraph boundaries and then trimmed to this length.
 */
const MAX_CHUNK_CHARS = 800;

/**
 * Minimum chunk length (in characters) to be considered a real passage.
 * Strips stray whitespace-only or single-character chunks.
 * Kept deliberately small so short-but-valid paragraphs are not discarded.
 */
const MIN_CHUNK_CHARS = 5;

/**
 * Split raw KB text into paragraphs.
 * Splits on two or more consecutive newlines, normalising \r\n and \r.
 */
export function splitIntoParagraphs(kb: string): string[] {
  return kb
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= MIN_CHUNK_CHARS);
}

/**
 * Chunk a KB paragraph into slices no longer than MAX_CHUNK_CHARS,
 * trying to break on sentence boundaries ('. ').
 */
function chunkParagraph(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHUNK_CHARS) return [paragraph];

  const chunks: string[] = [];
  let remaining = paragraph;

  while (remaining.length > MAX_CHUNK_CHARS) {
    // Try to find a sentence boundary within the window
    const window = remaining.slice(0, MAX_CHUNK_CHARS);
    const lastDot = window.lastIndexOf('. ');
    const cutAt = lastDot > MAX_CHUNK_CHARS / 2 ? lastDot + 2 : MAX_CHUNK_CHARS;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  if (remaining.length >= MIN_CHUNK_CHARS) chunks.push(remaining);
  return chunks;
}

/**
 * Tokenise text into a set of lowercase words for overlap scoring.
 * Strips punctuation and common stop words so common filler does not dominate.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'it', 'its', 'this', 'that', 'i', 'you', 'he', 'she', 'we', 'they',
  'what', 'which', 'who', 'how', 'when', 'where', 'why', 'can', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'not', 'no',
]);

function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

/**
 * Score a passage against a query using Jaccard-style token overlap.
 * Returns a value in [0, 1].
 */
function scorePassage(passageTokens: Set<string>, queryTokens: Set<string>): number {
  if (queryTokens.size === 0 || passageTokens.size === 0) return 0;

  let intersection = 0;
  for (const t of queryTokens) {
    if (passageTokens.has(t)) intersection++;
  }

  // Jaccard: |A∩B| / |A∪B|
  const union = queryTokens.size + passageTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Load a KB string into passage chunks.
 * Returns an array of plain-text passages, each within MAX_CHUNK_CHARS.
 *
 * @throws {Error} if the KB is empty after trimming.
 */
export function loadKb(kb: string): string[] {
  const trimmed = kb.trim();
  if (trimmed.length === 0) throw new Error('Knowledge base is empty.');

  const paragraphs = splitIntoParagraphs(trimmed);
  if (paragraphs.length === 0) throw new Error('Knowledge base contains no usable passages.');

  return paragraphs.flatMap(chunkParagraph);
}

/**
 * Retrieve the top-K most relevant passages from a KB for a given question.
 *
 * - Returns up to TOP_K passages ranked by keyword overlap.
 * - If the KB is empty or produces no chunks, returns an empty array.
 * - Passages with score 0 (zero overlap) are only included when there are fewer
 *   than TOP_K non-zero-scoring passages (fallback: return the first TOP_K chunks
 *   so the model always has *some* context to say "I don't know" from).
 *
 * @param question  The user's question (untrusted input — used only for tokenisation).
 * @param kb        The raw knowledge-base text.
 * @returns         Ranked array of Passage objects.
 */
export function retrievePassages(question: string, kb: string): Passage[] {
  let chunks: string[];
  try {
    chunks = loadKb(kb);
  } catch {
    return [];
  }

  if (chunks.length === 0) return [];

  const queryTokens = tokenise(question);

  const scored = chunks.map((text, index) => ({
    text,
    index,
    score: scorePassage(tokenise(text), queryTokens),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const topK = scored.slice(0, TOP_K);

  // If every result scored 0 (query had no meaningful tokens or no overlap),
  // fall back to the first TOP_K chunks in order so the model gets context.
  const allZero = topK.every((p) => p.score === 0);
  if (allZero) {
    return chunks.slice(0, TOP_K).map((text, index) => ({ text, index, score: 0 }));
  }

  return topK.map((p): Passage => ({
    text: p.text,
    score: p.score,
    index: p.index,
  }));
}
