/**
 * Checkout form configuration: which fields the storefront's checkout form
 * exposes, which are required, and which payment methods are offered.
 *
 * The configuration is editable by admins through `/admin/settings/checkout`
 * and persisted in the api-gateway as a hidden category named
 * `SETTINGS_CATEGORY_NAME` whose `description` carries the JSON payload
 * sentinel-wrapped (the same trick used for product extras). This keeps the
 * remote schema unchanged and survives Netlify deploys.
 *
 * Defaults reproduce the historical hard-coded checkout exactly, so removing
 * the settings record (or running against an api-gateway without it) keeps
 * the storefront working unchanged.
 */
import { PAYMENT_METHODS, type PaymentMethod } from "./utils";

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

/**
 * Default config: matches the original hard-coded checkout — every field
 * visible, every field required except the optional "notes", both payment
 * methods enabled.
 */
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

/**
 * Normalise a possibly-untrusted config (e.g. parsed from the API or a form
 * submission) into a complete `CheckoutSettings`. Unknown fields are ignored;
 * missing fields fall back to defaults so the checkout never goes blank if
 * the schema is extended later.
 */
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
// Persistence: pack/unpack into the hidden `__settings__` category description
// ---------------------------------------------------------------------------

export const SETTINGS_CATEGORY_NAME = "__settings__";

const SETTINGS_MARKER = "<!--TOPPACK_CHECKOUT_SETTINGS:";
const SETTINGS_END = "-->";

export function packSettingsDescription(settings: CheckoutSettings): string {
  return `${SETTINGS_MARKER}${JSON.stringify(settings)}${SETTINGS_END}`;
}

export function unpackSettingsDescription(raw: string | null | undefined): CheckoutSettings {
  if (!raw) return defaultCheckoutSettings();
  const idx = raw.indexOf(SETTINGS_MARKER);
  if (idx === -1) return defaultCheckoutSettings();
  const tail = raw.slice(idx + SETTINGS_MARKER.length);
  const endIdx = tail.indexOf(SETTINGS_END);
  if (endIdx === -1) return defaultCheckoutSettings();
  const json = tail.slice(0, endIdx);
  try {
    return normaliseCheckoutSettings(JSON.parse(json));
  } catch {
    return defaultCheckoutSettings();
  }
}
