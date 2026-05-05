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

export function defaultIntegrationsSettings(): IntegrationsSettings {
  return { metaPixelId: "", metaCapiToken: "", metaCapiTestEventCode: "" };
}

export function normaliseIntegrationsSettings(input: unknown): IntegrationsSettings {
  if (!input || typeof input !== "object") return defaultIntegrationsSettings();
  const r = input as Record<string, unknown>;
  // The Pixel ID must be safe to inline into a <script>: numeric digits only.
  const rawPixel = trimString(r.metaPixelId, 32);
  const metaPixelId = /^[0-9]{1,32}$/.test(rawPixel) ? rawPixel : "";
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
// Top-level SiteSettings
// ---------------------------------------------------------------------------

export interface SiteSettings {
  checkout: CheckoutSettings;
  contact: ContactInfo;
  integrations: IntegrationsSettings;
  account: AccountSettings;
}

export function defaultSiteSettings(): SiteSettings {
  return {
    checkout: defaultCheckoutSettings(),
    contact: defaultContactInfo(),
    integrations: defaultIntegrationsSettings(),
    account: defaultAccountSettings(),
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
