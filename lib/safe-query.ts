/**
 * Helpers for running Prisma queries from server components without crashing
 * the entire page render when the database is unreachable or the schema has
 * not been applied yet (e.g. fresh Postgres on Netlify with no `prisma db
 * push` / `migrate deploy` ever run against it).
 *
 * The admin dashboard intentionally calls these wrappers instead of calling
 * Prisma directly so that a single failing query produces a friendly empty
 * state + banner instead of the generic Next.js
 * `Application error: a server-side exception has occurred (Digest: …)`
 * page that hides the real cause from the operator.
 */

export type SafeQueryResult<T> = { ok: true; data: T } | { ok: false; data: T; error: string };

/**
 * Run a Prisma query and return either its result or a fallback value, never
 * throwing. The error (if any) is logged to the server console so it is still
 * visible in Netlify function logs for debugging.
 */
export async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<SafeQueryResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[admin] query "${label}" failed:`, message);
    return { ok: false, data: fallback, error: message };
  }
}

/**
 * Render-friendly summary used by admin pages to show a single banner when
 * one or more queries failed.
 */
export function collectErrors(...results: SafeQueryResult<unknown>[]): string | null {
  // Find the first failing result. The narrow on `!r.ok` lets TypeScript know
  // the `error` property is present.
  const firstError = results.find((r): r is { ok: false; data: unknown; error: string } => !r.ok);
  if (!firstError) return null;
  // Surface only the first error message — they are usually variations of the
  // same root cause (e.g. P2021 "table does not exist" or a connection error).
  return firstError.error;
}
