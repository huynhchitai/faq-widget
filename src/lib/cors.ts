/**
 * CORS helper for the FAQ widget API.
 *
 * The widget is embeddable on any third-party site, so the API deliberately
 * allows cross-origin requests from any origin (`*`). This is an explicit
 * trade-off — see SECURITY.md §Cross-Origin Policy for the reasoning and
 * the mitigating controls (rate limiting, input validation, grounded answers).
 *
 * Usage in a route handler:
 *   import { corsHeaders, handleOptions } from '@/lib/cors';
 *
 *   export function OPTIONS() { return handleOptions(); }
 *
 *   export async function POST(req: Request) {
 *     const res = NextResponse.json(data);
 *     Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
 *     return res;
 *   }
 */

/** Headers applied to every CORS response, including preflight. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 h
};

/**
 * Handle an OPTIONS preflight request.
 * Returns 204 No Content with the CORS headers.
 */
export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Attach CORS headers to an existing Response object (mutates in place).
 */
export function withCors(res: Response): Response {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
