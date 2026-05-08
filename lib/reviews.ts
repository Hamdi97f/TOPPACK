/**
 * Customer reviews ("avis client") attached to a product.
 *
 * The upstream api-gateway has no native review entity, so we reuse the
 * hidden-category side-channel pattern already used for `__settings__` and
 * `__devis__:*`: each review is persisted as a category whose name encodes
 * the product id and the creation timestamp, and whose `description` carries
 * a sentinel-wrapped JSON document with the review payload.
 *
 * Naming format: `__avis__:<productId>:<createdAtIso>`. Embedding the
 * timestamp in the name lets list/sort operations work without reading each
 * description individually, mirroring the devis convention.
 */

export const REVIEW_NAME_PREFIX = "__avis__:";
const REVIEW_MARKER_START = "TOPPACK_REVIEW:";
const REVIEW_MARKER_END = ":END_REVIEW";

/** Min/max stars an admin can assign to a review. */
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;

export interface ReviewPayload {
  /** Display name shown on the storefront. */
  authorName: string;
  /** 1..5 star rating. */
  rating: number;
  /** Free-form comment (plain text, capped at 2000 chars). */
  comment: string;
}

export interface ReviewRecord extends ReviewPayload {
  id: string;
  productId: string;
  /** ISO-8601 timestamp; encoded in the category name. */
  createdAt: string;
}

export function isReviewCategoryName(name: string | null | undefined): boolean {
  return !!name && name.startsWith(REVIEW_NAME_PREFIX);
}

export function buildReviewCategoryName(productId: string, createdAt: string): string {
  return `${REVIEW_NAME_PREFIX}${productId}:${createdAt}`;
}

export function parseReviewCategoryName(
  name: string
): { productId: string; createdAt: string } | null {
  if (!isReviewCategoryName(name)) return null;
  const rest = name.slice(REVIEW_NAME_PREFIX.length);
  // Split on the *first* colon — `productId` is a UUID without colons, and
  // the ISO timestamp may itself contain colons.
  const idx = rest.indexOf(":");
  if (idx <= 0 || idx >= rest.length - 1) return null;
  return {
    productId: rest.slice(0, idx),
    createdAt: rest.slice(idx + 1),
  };
}

export function packReviewDescription(payload: ReviewPayload): string {
  const safe = normaliseReviewPayload(payload);
  return `${REVIEW_MARKER_START}${JSON.stringify(safe)}${REVIEW_MARKER_END}`;
}

export function unpackReviewDescription(
  raw: string | null | undefined
): ReviewPayload | null {
  if (!raw) return null;
  const start = raw.indexOf(REVIEW_MARKER_START);
  if (start === -1) return null;
  const tail = raw.slice(start + REVIEW_MARKER_START.length);
  const end = tail.lastIndexOf(REVIEW_MARKER_END);
  if (end === -1) return null;
  try {
    const parsed = JSON.parse(tail.slice(0, end)) as Partial<ReviewPayload>;
    return normaliseReviewPayload(parsed);
  } catch {
    return null;
  }
}

/**
 * Coerce arbitrary input into a clean `ReviewPayload`. Used both at write
 * time (defence in depth on top of the zod validator) and at read time to
 * tolerate older/manually-edited records.
 */
export function normaliseReviewPayload(raw: Partial<ReviewPayload>): ReviewPayload {
  const authorName = typeof raw.authorName === "string" ? raw.authorName.trim().slice(0, 120) : "";
  const comment = typeof raw.comment === "string" ? raw.comment.trim().slice(0, 2000) : "";
  let rating = typeof raw.rating === "number" ? raw.rating : Number(raw.rating);
  if (!Number.isFinite(rating)) rating = REVIEW_RATING_MAX;
  rating = Math.round(rating);
  if (rating < REVIEW_RATING_MIN) rating = REVIEW_RATING_MIN;
  if (rating > REVIEW_RATING_MAX) rating = REVIEW_RATING_MAX;
  return { authorName, rating, comment };
}
