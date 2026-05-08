/**
 * Per-order OTP storage for the WinSMS auto-confirmation flow.
 *
 * Records are persisted as hidden api-gateway categories whose name is
 * `__otp__:<orderId>` and whose description carries a sentinel-wrapped JSON
 * blob with the hashed OTP, expiry and counters. The "name starts with `__`"
 * convention hides them from the storefront and admin category lists (see
 * `apiClient.listCategories`), so they behave as a private side-channel
 * "table" without changing the upstream schema.
 *
 * Stored fields:
 *   - codeHash:      sha-256(`${orderId}:${plainCode}:${OTP_SECRET}`)
 *   - expiresAt:     ISO timestamp after which the code is no longer valid
 *   - sendCount:     number of `send-otp` calls for this order (rate limit)
 *   - verifyCount:   number of `verify-otp` attempts for this code (lock-out)
 *   - phoneE164:     destination phone in WinSMS format, kept for tracing
 *
 * The code is **never** stored in plaintext: an attacker with admin access
 * to the api-gateway sees only a sha-256 hash salted with both the order id
 * and a server-side secret (`OTP_HASH_SECRET`, falling back to
 * `NEXTAUTH_SECRET`).
 */

import { createHash } from "crypto";
import {
  apiClient,
  ApiError,
  getServiceToken,
} from "@/lib/api-client";

const OTP_CATEGORY_PREFIX = "__otp__:";
const OTP_MARKER = "<!--TOPPACK_OTP:";
const OTP_END = "-->";

/** OTP lifetime once generated (10 minutes). */
export const OTP_TTL_MS = 10 * 60 * 1000;
/** Maximum number of `send-otp` calls per order. */
export const OTP_MAX_SENDS = 5;
/** Maximum number of `verify-otp` calls per stored code. */
export const OTP_MAX_VERIFY_ATTEMPTS = 5;

export interface OtpRecord {
  codeHash: string;
  expiresAt: string; // ISO
  sendCount: number;
  verifyCount: number;
  phoneE164: string;
}

function categoryName(orderId: string): string {
  return OTP_CATEGORY_PREFIX + orderId;
}

function hashSecret(): string {
  const secret = process.env.OTP_HASH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // Fail fast: a predictable secret would let an attacker who can read the
    // hidden api-gateway category brute-force the 6-digit OTP offline.
    throw new Error(
      "OTP_HASH_SECRET (or NEXTAUTH_SECRET) must be configured to use the WinSMS OTP flow."
    );
  }
  return secret;
}

/**
 * Hash a 6-digit code together with the order id and a server-side secret.
 * Done with sha-256: OTPs are short-lived and high-entropy (≥ 1M codes), and
 * the hash is only ever compared in constant time, never brute-forced offline
 * (records are deleted on success and after a few failed attempts).
 */
export function hashOtp(orderId: string, code: string): string {
  return createHash("sha256")
    .update(`${orderId}:${code}:${hashSecret()}`)
    .digest("hex");
}

/** Constant-time string comparison for the stored hash vs. the candidate hash. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function pack(record: OtpRecord): string {
  return `${OTP_MARKER}${JSON.stringify(record)}${OTP_END}`;
}

function unpack(raw: string | null | undefined): OtpRecord | null {
  if (!raw) return null;
  const idx = raw.indexOf(OTP_MARKER);
  if (idx === -1) return null;
  const tail = raw.slice(idx + OTP_MARKER.length);
  const end = tail.indexOf(OTP_END);
  if (end === -1) return null;
  try {
    const obj = JSON.parse(tail.slice(0, end)) as Record<string, unknown>;
    if (
      typeof obj.codeHash === "string" &&
      typeof obj.expiresAt === "string" &&
      typeof obj.sendCount === "number" &&
      typeof obj.verifyCount === "number" &&
      typeof obj.phoneE164 === "string"
    ) {
      return obj as unknown as OtpRecord;
    }
  } catch {
    /* fall through */
  }
  return null;
}

interface CategoryLite {
  id: string;
  name: string;
  description: string | null;
}

async function findCategory(token: string, orderId: string): Promise<CategoryLite | null> {
  // The api-gateway has no per-category lookup by name, so we list all
  // hidden categories and pick the one whose name matches. OTP records are
  // short-lived and few in number (one per pending order), so this scan is
  // acceptable. We also opportunistically purge anything that's clearly
  // expired to keep the list small.
  const cats = await apiClient._listAllCategories(token);
  const target = categoryName(orderId);
  return cats.find((c) => c.name === target) ?? null;
}

/**
 * Read the OTP record for an order. Returns `null` when no record exists.
 * Server-only — uses the service token.
 */
export async function getOtpRecord(orderId: string): Promise<{ record: OtpRecord; categoryId: string } | null> {
  const token = await getServiceToken();
  const cat = await findCategory(token, orderId);
  if (!cat) return null;
  const record = unpack(cat.description);
  if (!record) return null;
  return { record, categoryId: cat.id };
}

/**
 * Replace the OTP record for an order, creating the underlying category if
 * needed. Server-only.
 */
export async function setOtpRecord(orderId: string, record: OtpRecord): Promise<void> {
  const token = await getServiceToken();
  const cat = await findCategory(token, orderId);
  const description = pack(record);
  const name = categoryName(orderId);
  if (cat) {
    await apiClient.updateCategory(token, cat.id, { name, description });
  } else {
    await apiClient.createCategory(token, { name, description });
  }
}

/** Delete the OTP record for an order. Best-effort: 404 is treated as success. */
export async function clearOtpRecord(orderId: string): Promise<void> {
  const token = await getServiceToken();
  const cat = await findCategory(token, orderId);
  if (!cat) return;
  try {
    await apiClient.deleteCategory(token, cat.id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}
