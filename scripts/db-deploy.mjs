#!/usr/bin/env node
/**
 * Best-effort `prisma db push` wrapper used during Netlify (and any other
 * remote) builds.
 *
 * Goals:
 *  - On a fresh Postgres instance that has DATABASE_URL configured but no
 *    tables, automatically create the schema so the admin dashboard does not
 *    crash on first load with "relation does not exist".
 *  - Never break the build because of a transient DB issue or a missing
 *    DATABASE_URL — log a warning and continue. The application code already
 *    degrades gracefully when the DB is unreachable.
 */

import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[db-deploy] DATABASE_URL not set — skipping prisma db push.");
  process.exit(0);
}

console.log("[db-deploy] Applying Prisma schema with `prisma db push`…");
const result = spawnSync(
  "npx",
  ["prisma", "db", "push", "--accept-data-loss", "--skip-generate"],
  { stdio: "inherit", env: process.env }
);

if (result.error) {
  console.warn(`[db-deploy] Could not run prisma db push: ${result.error.message}. Continuing build.`);
  process.exit(0);
}
if (result.status !== 0) {
  console.warn(`[db-deploy] prisma db push exited with code ${result.status}. Continuing build; the app will surface a friendly error if the schema is missing at runtime.`);
  process.exit(0);
}
console.log("[db-deploy] Schema applied successfully.");
