/**
 * Unified site settings persisted in the api-gateway.
 *
 * All admin-editable runtime configuration is bundled into a single
 * `SiteSettings` document and stored in the description field of a hidden
 * category named `SETTINGS_CATEGORY_NAME`. This avoids any schema migration
 * on the upstream gateway and survives Netlify deploys.
 *
 * Sections:
 *   - `checkout`     — which checkout fields are visible/required + payment methods
 *   - `contact`      — contact information shown on the storefront
 *   - `integrations` — third-party integrations (currently Meta Pixel + CAPI)
 *   - `account`      — account-related toggles (e.g. require sign-in to order)
 *
 * Defaults reproduce the historical behaviour exactly, so removing the
 * settings record keeps the storefront working unchanged.
 *
 * Backwards compatibility: settings written by an earlier version of the app
 * carried only the checkout section under a different sentinel marker
 * (`TOPPACK_CHECKOUT_SETTINGS:`). `unpackSiteSettings` recognises both
 * markers and migrates the legacy payload on read.
 */
import { PAYMENT_METHODS, type PaymentMethod } from "./utils";

// ---------------------------------------------------------------------------
// Checkout section
// ---------------------------------------------------------------------------

export const CHECKOUT_FIELDS = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "addressLine",
  "city",
  "postalCode",
  "country",
  "notes",
] as const;
export type CheckoutFieldKey = (typeof CHECKOUT_FIELDS)[number];

export interface CheckoutFieldConfig {
  field: CheckoutFieldKey;
  visible: boolean;
  required: boolean;
}

export interface CheckoutSettings {
  fields: CheckoutFieldConfig[];
  paymentMethods: PaymentMethod[];
}

const FIELD_LABELS: Record<CheckoutFieldKey, string> = {
  customerName: "Nom complet",
  customerEmail: "E-mail",
  customerPhone: "Téléphone",
  addressLine: "Adresse",
  city: "Ville",
  postalCode: "Code postal",
  country: "Pays",
  notes: "Notes",
};

export function fieldLabel(key: CheckoutFieldKey): string {
  return FIELD_LABELS[key];
}

export function defaultCheckoutSettings(): CheckoutSettings {
  return {
    fields: CHECKOUT_FIELDS.map((field) => ({
      field,
      visible: true,
      required: field !== "notes",
    })),
    paymentMethods: [...PAYMENT_METHODS],
  };
}

function isCheckoutFieldKey(value: unknown): value is CheckoutFieldKey {
  return typeof value === "string" && (CHECKOUT_FIELDS as readonly string[]).includes(value);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function normaliseCheckoutSettings(input: unknown): CheckoutSettings {
  const defaults = defaultCheckoutSettings();
  if (!input || typeof input !== "object") return defaults;
  const obj = input as Record<string, unknown>;

  const incomingFields = Array.isArray(obj.fields) ? obj.fields : [];
  const byKey = new Map<CheckoutFieldKey, CheckoutFieldConfig>();
  for (const raw of incomingFields) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (!isCheckoutFieldKey(r.field)) continue;
    byKey.set(r.field, {
      field: r.field,
      visible: r.visible !== false,
      required: r.required === true,
    });
  }
  const fields: CheckoutFieldConfig[] = CHECKOUT_FIELDS.map(
    (key) => byKey.get(key) ?? defaults.fields.find((f) => f.field === key)!
  );

  let paymentMethods: PaymentMethod[];
  if (Array.isArray(obj.paymentMethods)) {
    paymentMethods = obj.paymentMethods.filter(isPaymentMethod);
    if (paymentMethods.length === 0) paymentMethods = defaults.paymentMethods;
  } else {
    paymentMethods = defaults.paymentMethods;
  }

  return { fields, paymentMethods };
}

// ---------------------------------------------------------------------------
// Contact section
// ---------------------------------------------------------------------------

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
  hours: string;
  mapUrl: string;
}

export function defaultContactInfo(): ContactInfo {
  return {
    email: "support@toppack.local",
    phone: "+1 (555) 010-2030",
    address: "",
    hours: "Lun.–Ven., 9h–18h",
    mapUrl: "",
  };
}

function trimString(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

export function normaliseContactInfo(input: unknown): ContactInfo {
  if (!input || typeof input !== "object") return defaultContactInfo();
  const r = input as Record<string, unknown>;
  const defaults = defaultContactInfo();
  return {
    email: trimString(r.email, 200) || defaults.email,
    phone: trimString(r.phone, 50) || defaults.phone,
    address: trimString(r.address, 500),
    hours: trimString(r.hours, 200) || defaults.hours,
    mapUrl: trimString(r.mapUrl, 1000),
  };
}

// ---------------------------------------------------------------------------
// Integrations section (Meta Pixel + CAPI)
// ---------------------------------------------------------------------------

export interface IntegrationsSettings {
  metaPixelId: string;
  metaCapiToken: string;
  metaCapiTestEventCode: string;
}

// Meta Pixel IDs are numeric and short. The same regex is used to validate
// the admin-supplied value before persistence and before inlining the id into
// the browser-side script (see `MetaPixel`).
export const META_PIXEL_ID_RE = /^[0-9]{1,32}$/;

export function defaultIntegrationsSettings(): IntegrationsSettings {
  return { metaPixelId: "", metaCapiToken: "", metaCapiTestEventCode: "" };
}

export function normaliseIntegrationsSettings(input: unknown): IntegrationsSettings {
  if (!input || typeof input !== "object") return defaultIntegrationsSettings();
  const r = input as Record<string, unknown>;
  // The Pixel ID must be safe to inline into a <script>: numeric digits only.
  const rawPixel = trimString(r.metaPixelId, 32);
  const metaPixelId = META_PIXEL_ID_RE.test(rawPixel) ? rawPixel : "";
  return {
    metaPixelId,
    metaCapiToken: trimString(r.metaCapiToken, 500),
    metaCapiTestEventCode: trimString(r.metaCapiTestEventCode, 100),
  };
}

// ---------------------------------------------------------------------------
// Account section
// ---------------------------------------------------------------------------

export interface AccountSettings {
  /** When true, anonymous customers cannot place orders — they must sign in. */
  requireAccountForOrder: boolean;
}

export function defaultAccountSettings(): AccountSettings {
  return { requireAccountForOrder: false };
}

export function normaliseAccountSettings(input: unknown): AccountSettings {
  if (!input || typeof input !== "object") return defaultAccountSettings();
  const r = input as Record<string, unknown>;
  return { requireAccountForOrder: r.requireAccountForOrder === true };
}

// ---------------------------------------------------------------------------
// Branding section (site title, description, social image, favicon)
// ---------------------------------------------------------------------------

/**
 * Branding controls the values exposed in the site's HTML `<head>`:
 * the default `<title>`, the meta description, the Open Graph / Twitter
 * social-share image and the favicon.
 *
 * Image fields accept either an absolute http(s) URL or a relative path
 * served by the app itself (e.g. `/api/files/<id>` for assets uploaded
 * through the admin upload route, or a path under `/public`). An empty
 * string falls back to the built-in defaults.
 */
export interface BrandingSettings {
  siteTitle: string;
  siteDescription: string;
  socialImageUrl: string;
  faviconUrl: string;
}

export const DEFAULT_SITE_TITLE = "TOPPACK — Cartons en carton ondulé";
export const DEFAULT_SITE_DESCRIPTION =
  "TOPPACK fabrique et vend des cartons ondulés de haute qualité — simple cannelure, double cannelure, enveloppes d'expédition et emballages personnalisés.";

export function defaultBrandingSettings(): BrandingSettings {
  return {
    siteTitle: DEFAULT_SITE_TITLE,
    siteDescription: DEFAULT_SITE_DESCRIPTION,
    socialImageUrl: "",
    faviconUrl: "",
  };
}

/**
 * Returns true when `value` is safe to inline as an `href`/`content`
 * attribute in `<head>`: an absolute http(s) URL, or a same-origin path
 * (starting with `/` but not `//`). This blocks `javascript:` and other
 * dangerous URI schemes that could otherwise be injected through the
 * admin form and rendered into the document head.
 */
export function isSafeAssetUrl(value: string): boolean {
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  // Same-origin path: must start with a single "/" and not "//" (which
  // would be a protocol-relative URL pointing at another host).
  return value.startsWith("/") && !value.startsWith("//");
}

export function normaliseBrandingSettings(input: unknown): BrandingSettings {
  const defaults = defaultBrandingSettings();
  if (!input || typeof input !== "object") return defaults;
  const r = input as Record<string, unknown>;
  const siteTitle = trimString(r.siteTitle, 200) || defaults.siteTitle;
  const siteDescription = trimString(r.siteDescription, 500) || defaults.siteDescription;
  const rawSocial = trimString(r.socialImageUrl, 1000);
  const rawFavicon = trimString(r.faviconUrl, 1000);
  return {
    siteTitle,
    siteDescription,
    socialImageUrl: isSafeAssetUrl(rawSocial) ? rawSocial : "",
    faviconUrl: isSafeAssetUrl(rawFavicon) ? rawFavicon : "",
  };
}

// ---------------------------------------------------------------------------
// Shipping section (quantity-tier-based shipping fees)
// ---------------------------------------------------------------------------

/**
 * A single shipping tier. The fee applies whenever the cart's total quantity
 * is greater than or equal to `minQuantity`. The effective fee for a cart is
 * the fee of the highest matching tier (i.e. the tier with the largest
 * `minQuantity` ≤ cart quantity). When no tier matches (or the list is
 * empty) the shipping fee is 0.
 *
 * Example admin configuration:
 *   [{ minQuantity: 1, fee: 7 }, { minQuantity: 3, fee: 14 }, { minQuantity: 5, fee: 21 }]
 *   - 1–2 items   → 7 DT
 *   - 3–4 items   → 14 DT
 *   - 5+ items    → 21 DT
 */
export interface ShippingTier {
  minQuantity: number;
  fee: number;
}

export interface ShippingSettings {
  /** When true, the configured tiers are applied to carts and orders. */
  enabled: boolean;
  /** Tiers sorted ascending by `minQuantity`. */
  tiers: ShippingTier[];
}

export function defaultShippingSettings(): ShippingSettings {
  return { enabled: false, tiers: [] };
}

export function normaliseShippingSettings(input: unknown): ShippingSettings {
  if (!input || typeof input !== "object") return defaultShippingSettings();
  const r = input as Record<string, unknown>;
  const rawTiers = Array.isArray(r.tiers) ? r.tiers : [];
  const tiers: ShippingTier[] = [];
  for (const raw of rawTiers) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as Record<string, unknown>;
    const minQuantity = Math.floor(Number(t.minQuantity));
    const fee = Number(t.fee);
    if (!Number.isFinite(minQuantity) || minQuantity < 1) continue;
    if (!Number.isFinite(fee) || fee < 0) continue;
    tiers.push({ minQuantity, fee });
  }
  // Sort ascending and de-duplicate by minQuantity (last write wins).
  tiers.sort((a, b) => a.minQuantity - b.minQuantity);
  const deduped: ShippingTier[] = [];
  for (const t of tiers) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.minQuantity === t.minQuantity) deduped[deduped.length - 1] = t;
    else deduped.push(t);
  }
  return { enabled: r.enabled === true, tiers: deduped };
}

/**
 * Compute the shipping fee for a cart of `totalQuantity` items, given the
 * admin-configured shipping settings. Returns 0 when shipping is disabled,
 * no tiers are configured, or the cart is empty.
 */
export function computeShippingFee(totalQuantity: number, settings: ShippingSettings): number {
  if (!settings.enabled) return 0;
  if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) return 0;
  if (settings.tiers.length === 0) return 0;
  // Tiers are stored sorted ascending by minQuantity. Walk from the highest
  // and return the first tier whose threshold is reached.
  for (let i = settings.tiers.length - 1; i >= 0; i--) {
    const t = settings.tiers[i];
    if (totalQuantity >= t.minQuantity) return t.fee;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Top-level SiteSettings
// ---------------------------------------------------------------------------

export interface SiteSettings {
  checkout: CheckoutSettings;
  contact: ContactInfo;
  integrations: IntegrationsSettings;
  account: AccountSettings;
  branding: BrandingSettings;
  shipping: ShippingSettings;
}

export function defaultSiteSettings(): SiteSettings {
  return {
    checkout: defaultCheckoutSettings(),
    contact: defaultContactInfo(),
    integrations: defaultIntegrationsSettings(),
    account: defaultAccountSettings(),
    branding: defaultBrandingSettings(),
    shipping: defaultShippingSettings(),
  };
}

export function normaliseSiteSettings(input: unknown): SiteSettings {
  if (!input || typeof input !== "object") return defaultSiteSettings();
  const r = input as Record<string, unknown>;
  return {
    checkout: normaliseCheckoutSettings(r.checkout),
    contact: normaliseContactInfo(r.contact),
    integrations: normaliseIntegrationsSettings(r.integrations),
    account: normaliseAccountSettings(r.account),
    branding: normaliseBrandingSettings(r.branding),
    shipping: normaliseShippingSettings(r.shipping),
  };
}

// ---------------------------------------------------------------------------
// Persistence: pack/unpack into the hidden `__settings__` category description
// ---------------------------------------------------------------------------

export const SETTINGS_CATEGORY_NAME = "__settings__";

const SITE_MARKER = "<!--TOPPACK_SITE_SETTINGS:";
const SITE_END = "-->";

// Legacy marker — only the checkout section was stored under it.
const LEGACY_CHECKOUT_MARKER = "<!--TOPPACK_CHECKOUT_SETTINGS:";

export function packSiteSettings(settings: SiteSettings): string {
  return `${SITE_MARKER}${JSON.stringify(settings)}${SITE_END}`;
}

export function unpackSiteSettings(raw: string | null | undefined): SiteSettings {
  if (!raw) return defaultSiteSettings();

  const siteIdx = raw.indexOf(SITE_MARKER);
  if (siteIdx !== -1) {
    const tail = raw.slice(siteIdx + SITE_MARKER.length);
    const endIdx = tail.indexOf(SITE_END);
    if (endIdx !== -1) {
      try {
        return normaliseSiteSettings(JSON.parse(tail.slice(0, endIdx)));
      } catch {
        return defaultSiteSettings();
      }
    }
  }

  // Legacy: only the checkout section was stored, parse it and return defaults
  // for the other sections. The next save will rewrite to the new format.
  const legacyIdx = raw.indexOf(LEGACY_CHECKOUT_MARKER);
  if (legacyIdx !== -1) {
    const tail = raw.slice(legacyIdx + LEGACY_CHECKOUT_MARKER.length);
    const endIdx = tail.indexOf(SITE_END);
    if (endIdx !== -1) {
      try {
        const checkout = normaliseCheckoutSettings(JSON.parse(tail.slice(0, endIdx)));
        return { ...defaultSiteSettings(), checkout };
      } catch {
        /* fall through */
      }
    }
  }

  return defaultSiteSettings();
}
