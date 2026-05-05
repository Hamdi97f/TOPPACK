/**
 * Backwards-compatible re-export. The checkout-only settings have been folded
 * into the unified `lib/site-settings.ts`. Existing imports continue to work
 * via the names below.
 */
export {
  CHECKOUT_FIELDS,
  type CheckoutFieldKey,
  type CheckoutFieldConfig,
  type CheckoutSettings,
  fieldLabel,
  defaultCheckoutSettings,
  normaliseCheckoutSettings,
  SETTINGS_CATEGORY_NAME,
} from "./site-settings";

import {
  defaultCheckoutSettings,
  packSiteSettings,
  unpackSiteSettings,
  defaultSiteSettings,
  type CheckoutSettings,
} from "./site-settings";

/**
 * Legacy helpers retained for callers that still write only the checkout
 * section. They round-trip through the unified blob so the other sections
 * are preserved.
 */
export function packSettingsDescription(settings: CheckoutSettings): string {
  return packSiteSettings({ ...defaultSiteSettings(), checkout: settings });
}

export function unpackSettingsDescription(raw: string | null | undefined): CheckoutSettings {
  if (!raw) return defaultCheckoutSettings();
  return unpackSiteSettings(raw).checkout;
}
