/**
 * Server-side resolver for live-edit overrides.
 *
 * `getEditable(id)` is the primary entry point used by storefront components.
 * It looks up the region in the registry, fetches the persisted overrides
 * (cached via `apiClient.getSiteSettings`'s tagged cache), validates each
 * override against the field schema, and returns a fully-resolved value map.
 *
 * `normaliseLiveEditsAgainstRegistry` is the registry-aware validator used by
 * the admin PUT route — it drops unknown region ids, unknown field keys and
 * any value that fails its field-type check.
 *
 * Type safety: the resolved value map is `Record<string, string | number>`.
 * Callers should index it with field keys declared in the registry; missing
 * keys fall back to the field's declared default.
 */

import { apiClient } from "@/lib/api-client";
import {
  isSafeAssetUrl,
  type LiveEditFieldValue,
  type LiveEditRegionOverrides,
  type LiveEditsSettings,
  normaliseLiveEditsSettings,
} from "@/lib/site-settings";
import {
  getRegion,
  HEX_COLOR_RE,
  type LiveEditFieldDef,
  type LiveEditRegionDef,
  LIVE_EDIT_REGIONS,
} from "./registry";

// ---------------------------------------------------------------------------
// Per-field value validation
// ---------------------------------------------------------------------------

/**
 * Returns the validated, coerced override value for `field` if `value`
 * satisfies the field's constraints; returns `undefined` otherwise (in which
 * case callers should fall back to the field's `default`).
 *
 * This function is the single security checkpoint for admin-supplied
 * overrides: the storefront and the admin PUT route both go through it.
 */
export function validateFieldValue(
  field: LiveEditFieldDef,
  value: unknown
): LiveEditFieldValue | undefined {
  switch (field.type) {
    case "text": {
      if (typeof value !== "string") return undefined;
      const max = field.maxLength ?? 500;
      // Strip control characters that have no business in user-facing copy
      // (they survive JSON round-tripping but can break CSS selectors and
      // confuse the editor preview). The character class below intentionally
      // preserves whitespace that may legitimately appear in copy: tab
      // (\x09), newline (\x0A) and carriage return (\x0D).
      const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      return cleaned.slice(0, max);
    }
    case "href": {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim().slice(0, field.maxLength ?? 500);
      if (!trimmed) return undefined;
      // Reuse the same allow-list as branding image URLs: http(s) absolute
      // URLs and same-origin paths starting with a single "/".
      if (!isSafeAssetUrl(trimmed)) return undefined;
      return trimmed;
    }
    case "color": {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return HEX_COLOR_RE.test(trimmed) ? trimmed.toLowerCase() : undefined;
    }
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) return undefined;
      const min = field.min ?? Number.NEGATIVE_INFINITY;
      const max = field.max ?? Number.POSITIVE_INFINITY;
      if (n < min || n > max) return undefined;
      return n;
    }
    case "select": {
      if (typeof value !== "string") return undefined;
      return field.options.some((o) => o.value === value) ? value : undefined;
    }
  }
}

// ---------------------------------------------------------------------------
// Region resolution
// ---------------------------------------------------------------------------

/**
 * Build a resolved value map for `region` by overlaying validated overrides
 * onto the field defaults. Unknown override keys and values that fail
 * validation are silently ignored (the corresponding default is kept).
 */
function resolveRegion(
  region: LiveEditRegionDef,
  overrides: LiveEditRegionOverrides | undefined
): Record<string, LiveEditFieldValue> {
  const out: Record<string, LiveEditFieldValue> = {};
  for (const field of region.fields) {
    let value: LiveEditFieldValue | undefined;
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, field.key)) {
      value = validateFieldValue(field, overrides[field.key]);
    }
    out[field.key] = value !== undefined ? value : field.default;
  }
  return out;
}

/**
 * Server-side helper used by storefront components. Fetches the cached site
 * settings and returns a fully-resolved value map for the region. When the
 * region id is unknown, returns an empty object so a stale call site cannot
 * crash a render (the caller will simply see all-default values via `??`).
 */
export async function getEditable(
  id: string
): Promise<Record<string, LiveEditFieldValue>> {
  const region = getRegion(id);
  if (!region) return {};
  const settings = await apiClient.getSiteSettings();
  return resolveRegion(region, settings.liveEdits[id]);
}

/**
 * Convenience wrapper that resolves multiple regions from a single
 * `SiteSettings` snapshot. Useful when a page renders many editable regions
 * and the caller already has the settings object in hand.
 */
export function resolveRegionsFromSettings(
  liveEdits: LiveEditsSettings,
  ids: string[]
): Record<string, Record<string, LiveEditFieldValue>> {
  const out: Record<string, Record<string, LiveEditFieldValue>> = {};
  for (const id of ids) {
    const region = getRegion(id);
    if (!region) {
      out[id] = {};
      continue;
    }
    out[id] = resolveRegion(region, liveEdits[id]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Registry-aware normaliser used by the admin PUT route
// ---------------------------------------------------------------------------

/**
 * Validate a `liveEdits` payload against the registry. Drops:
 *   - region ids not in the registry,
 *   - field keys not declared by the matching region,
 *   - values that fail the field-type validation.
 *
 * Empty regions (after filtering) are removed from the output. The resulting
 * object is then passed through the storage-level `normaliseLiveEditsSettings`
 * to enforce the size / count caps.
 */
export function normaliseLiveEditsAgainstRegistry(input: unknown): LiveEditsSettings {
  // First pass: shape sanitisation (drops non-objects, non-scalar values,
  // overlong strings) and size cap.
  const shaped = normaliseLiveEditsSettings(input);
  const out: LiveEditsSettings = {};
  for (const region of LIVE_EDIT_REGIONS) {
    const incoming = shaped[region.id];
    if (!incoming) continue;
    const fields: LiveEditRegionOverrides = {};
    for (const field of region.fields) {
      if (!Object.prototype.hasOwnProperty.call(incoming, field.key)) continue;
      const validated = validateFieldValue(field, incoming[field.key]);
      if (validated === undefined) continue;
      // Only persist values that actually differ from the declared default.
      // Keeps the blob small and lets the admin "reset" a field by clearing
      // it client-side without an explicit DELETE call.
      if (validated !== field.default) {
        fields[field.key] = validated;
      }
    }
    if (Object.keys(fields).length > 0) {
      out[region.id] = fields;
    }
  }
  // Re-apply the storage cap on the final, registry-validated payload.
  return normaliseLiveEditsSettings(out);
}
