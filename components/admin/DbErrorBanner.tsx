import * as React from "react";

/**
 * Friendly banner shown on admin pages when a Prisma query failed. Tries to
 * recognise the most common root cause (missing tables on a freshly-created
 * Postgres) so the operator gets actionable guidance instead of an opaque
 * server-side exception digest.
 */
export function DbErrorBanner({ error }: { error: string }) {
  const lower = error.toLowerCase();
  const missingSchema =
    lower.includes("does not exist") ||
    lower.includes("p2021") ||
    lower.includes("p2022") ||
    lower.includes('relation "') ||
    lower.includes("no such table");
  const cannotConnect =
    lower.includes("can't reach database") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("p1001") ||
    lower.includes("p1002");

  let title = "Database error";
  let hint: React.ReactNode = "Check the Netlify function logs for details.";
  if (missingSchema) {
    title = "Database schema not initialised";
    hint = (
      <>
        The database is reachable but the tables are missing. Trigger a fresh
        Netlify deploy (the build now runs <code>prisma db push</code>{" "}
        automatically), or run{" "}
        <code>DATABASE_URL=&quot;…&quot; npx prisma db push</code> against the
        production database.
      </>
    );
  } else if (cannotConnect) {
    title = "Cannot reach the database";
    hint = (
      <>
        Verify <code>DATABASE_URL</code> in Netlify environment variables and
        that the Postgres instance accepts connections from Netlify.
      </>
    );
  }

  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      <div className="font-semibold">{title}</div>
      <div className="mt-1">{hint}</div>
      <details className="mt-2 text-xs text-red-800/80">
        <summary className="cursor-pointer">Technical details</summary>
        <pre className="mt-1 whitespace-pre-wrap break-all">{error}</pre>
      </details>
    </div>
  );
}
