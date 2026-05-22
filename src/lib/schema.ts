import { z } from 'zod';

/** Zod schema for POST /api/ask request body. */
export const askRequestSchema = z.object({
  /** The user's question. 3–500 characters. */
  question: z
    .string()
    .min(3, 'Question must be at least 3 characters.')
    .max(500, 'Question must be at most 500 characters.'),
  /** The knowledge-base text to answer from. 20–40000 characters. */
  kb: z
    .string()
    .min(20, 'Knowledge base must be at least 20 characters.')
    .max(40_000, 'Knowledge base must be at most 40 000 characters.'),
});

export type AskRequestInput = z.infer<typeof askRequestSchema>;
