/** Shared TypeScript types for the FAQ Widget. */

export interface AskRequest {
  question: string;
  kb: string;
}

export interface Passage {
  /** The text of the passage selected from the KB. */
  text: string;
  /** Relevance score 0–1 (higher = more relevant). */
  score: number;
  /** Sequential index of the passage in the KB chunks. */
  index: number;
}

export interface AskResponseOk {
  ok: true;
  answer: string;
  /** Which KB passages the answer was grounded in. */
  passages: Passage[];
  /** Remaining rate-limit quota (-1 = no rate limiting configured). */
  remaining: number;
}

export type AskErrorCode =
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT'
  | 'MODEL_ERROR'
  | 'INTERNAL_ERROR';

export interface AskResponseError {
  ok: false;
  error: AskErrorCode;
  message: string;
}

export type AskResponse = AskResponseOk | AskResponseError;
