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
// Devis form section (configurable fields + minimum allowed quantity)
// ---------------------------------------------------------------------------

/**
 * Fields of the public "demande de devis" form whose visibility / required
 * status the admin can toggle. Identity fields and the carton specs are kept
 * configurable so the admin can simplify the form for casual visitors.
 *
 * Note: the "model" select, the three dimensions and the "quantity" input
 * are always shown and required — they are intrinsic to a devis. Quantity is
 * controlled separately via `minQuantity`.
 */
export const DEVIS_FORM_FIELDS = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "company",
  "ondulation",
  "cannelure",
  "color",
  "printing",
  "message",
] as const;
export type DevisFieldKey = (typeof DEVIS_FORM_FIELDS)[number];

export interface DevisFieldConfig {
  field: DevisFieldKey;
  visible: boolean;
  required: boolean;
}

export interface DevisFormSettings {
  fields: DevisFieldConfig[];
  /** Minimum quantity the customer can request (inclusive). Always ≥ 1. */
  minQuantity: number;
}

const DEVIS_FIELD_LABELS: Record<DevisFieldKey, string> = {
  customerName: "Nom complet",
  customerEmail: "E-mail",
  customerPhone: "Téléphone",
  company: "Société",
  ondulation: "Type d'ondulation",
  cannelure: "Cannelure",
  color: "Couleur du carton",
  printing: "Option d'impression",
  message: "Message complémentaire",
};

export function devisFieldLabel(key: DevisFieldKey): string {
  return DEVIS_FIELD_LABELS[key];
}

/** Default required state mirrors the historical (pre-settings) form. */
const DEVIS_DEFAULT_REQUIRED: Record<DevisFieldKey, boolean> = {
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  company: false,
  ondulation: true,
  cannelure: true,
  color: true,
  printing: false,
  message: false,
};

export function defaultDevisFormSettings(): DevisFormSettings {
  return {
    fields: DEVIS_FORM_FIELDS.map((field) => ({
      field,
      visible: true,
      required: DEVIS_DEFAULT_REQUIRED[field],
    })),
    minQuantity: 1,
  };
}

function isDevisFieldKey(value: unknown): value is DevisFieldKey {
  return typeof value === "string" && (DEVIS_FORM_FIELDS as readonly string[]).includes(value);
}

export function normaliseDevisFormSettings(input: unknown): DevisFormSettings {
  const defaults = defaultDevisFormSettings();
  if (!input || typeof input !== "object") return defaults;
  const obj = input as Record<string, unknown>;

  const incoming = Array.isArray(obj.fields) ? obj.fields : [];
  const byKey = new Map<DevisFieldKey, DevisFieldConfig>();
  for (const raw of incoming) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (!isDevisFieldKey(r.field)) continue;
    const visible = r.visible !== false;
    const required = visible && r.required === true;
    byKey.set(r.field, { field: r.field, visible, required });
  }
  const fields: DevisFieldConfig[] = DEVIS_FORM_FIELDS.map(
    (key) => byKey.get(key) ?? defaults.fields.find((f) => f.field === key)!
  );

  let minQuantity = Math.floor(Number(obj.minQuantity));
  if (!Number.isFinite(minQuantity) || minQuantity < 1) minQuantity = 1;
  if (minQuantity > 10_000_000) minQuantity = 10_000_000;

  return { fields, minQuantity };
}

/** Convenience: lookup a field's config (visible/required) from the settings. */
export function getDevisFieldConfig(
  settings: DevisFormSettings,
  key: DevisFieldKey
): DevisFieldConfig {
  return (
    settings.fields.find((f) => f.field === key) ?? {
      field: key,
      visible: true,
      required: DEVIS_DEFAULT_REQUIRED[key],
    }
  );
}

// ---------------------------------------------------------------------------
// Live-edit section (admin-supplied overrides for pre-marked editable regions)
// ---------------------------------------------------------------------------

/**
 * `LiveEditsSettings` stores admin-supplied overrides for regions declared in
 * `lib/live-edit/registry.ts`. Each region (keyed by its stable `editId`) maps
 * field keys to scalar override values (string | number).
 *
 * Validation against the registry happens in `lib/live-edit/editable.ts`
 * (`normaliseLiveEditsAgainstRegistry`) — the storage-level normaliser here
 * only enforces shape (object of objects of scalars) and a hard size cap so a
 * malformed or oversized payload cannot be persisted into the api-gateway
 * category description.
 */
export type LiveEditFieldValue = string | number;
export type LiveEditRegionOverrides = Record<string, LiveEditFieldValue>;
export type LiveEditsSettings = Record<string, LiveEditRegionOverrides>;

export const LIVE_EDITS_MAX_BYTES = 64 * 1024;
export const LIVE_EDITS_MAX_REGIONS = 200;
export const LIVE_EDITS_MAX_FIELDS_PER_REGION = 32;
export const LIVE_EDITS_MAX_STRING_LENGTH = 2000;

export function defaultLiveEditsSettings(): LiveEditsSettings {
  return {};
}

/**
 * Storage-level normaliser. Drops anything that isn't a plain object of plain
 * objects of string/number scalars, clamps strings, and aborts (returns the
 * default) if the result would exceed the size or count caps. Registry-level
 * validation (allowed ids / fields / value ranges) is applied separately by
 * `normaliseLiveEditsAgainstRegistry`.
 */
export function normaliseLiveEditsSettings(input: unknown): LiveEditsSettings {
  if (!input || typeof input !== "object") return defaultLiveEditsSettings();
  const r = input as Record<string, unknown>;
  const out: LiveEditsSettings = {};
  let regionCount = 0;
  for (const [id, raw] of Object.entries(r)) {
    if (regionCount >= LIVE_EDITS_MAX_REGIONS) break;
    if (typeof id !== "string" || id.length === 0 || id.length > 200) continue;
    if (!raw || typeof raw !== "object") continue;
    const fields: LiveEditRegionOverrides = {};
    let fieldCount = 0;
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (fieldCount >= LIVE_EDITS_MAX_FIELDS_PER_REGION) break;
      if (typeof key !== "string" || key.length === 0 || key.length > 100) continue;
      if (typeof value === "string") {
        fields[key] = value.slice(0, LIVE_EDITS_MAX_STRING_LENGTH);
        fieldCount++;
      } else if (typeof value === "number" && Number.isFinite(value)) {
        fields[key] = value;
        fieldCount++;
      }
    }
    if (Object.keys(fields).length > 0) {
      out[id] = fields;
      regionCount++;
    }
  }
  // Hard size cap on the serialized payload to protect the api-gateway
  // category description (which carries the whole SiteSettings JSON).
  try {
    if (JSON.stringify(out).length > LIVE_EDITS_MAX_BYTES) {
      return defaultLiveEditsSettings();
    }
  } catch {
    return defaultLiveEditsSettings();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Box comparator section (public 3D cardboard-box vs. standard-items page)
// ---------------------------------------------------------------------------

/**
 * Toggles the public `/box-comparator` page. When `enabled` is false the page
 * returns 404 for anonymous visitors and the link is hidden from the storefront
 * navigation. Admins can still preview the page (with a banner) so they can
 * verify the content before re-publishing it.
 */
export interface BoxComparatorSettings {
  enabled: boolean;
}

export function defaultBoxComparatorSettings(): BoxComparatorSettings {
  return { enabled: true };
}

export function normaliseBoxComparatorSettings(input: unknown): BoxComparatorSettings {
  if (!input || typeof input !== "object") return defaultBoxComparatorSettings();
  const r = input as Record<string, unknown>;
  // Default to true (published) unless the value is an explicit `false`. This
  // matches the rest of the SiteSettings sections, which fall back to the
  // built-in defaults when a key is missing — and the built-in default for
  // this feature is "published". When admins want it hidden they save an
  // explicit `false` from the settings form.
  return { enabled: r.enabled !== false };
}

// ---------------------------------------------------------------------------
// WinSMS / OTP order-auto-confirmation section
// ---------------------------------------------------------------------------

/**
 * Configuration for the WinSMS.tn integration that powers the optional
 * "auto-confirm by SMS OTP" flow shown on the order confirmation page.
 *
 * - `enabled` toggles the feature on the storefront. When false the buttons
 *   are not rendered and the OTP/send/verify endpoints reject calls.
 * - `apiKey` is the WinSMS API key. It is server-side only and **never**
 *   exposed through `/api/site-settings/public`.
 * - `senderId` is the approved alphanumeric sender shown to the customer
 *   (e.g. "TOPPACK"). WinSMS rejects unapproved IDs with code 106.
 * - `otpMessage` is the text sent to the customer. The substring `{code}`
 *   is replaced with the freshly-generated 6-digit OTP. If the template
 *   doesn't contain `{code}` the OTP is appended on its own line.
 *
 * Sender IDs on WinSMS are uppercase letters/digits/spaces/dashes, max 11
 * characters. We enforce that conservatively here so a malformed value can
 * never be persisted and silently rejected by the gateway.
 */
export interface WinSmsSettings {
  enabled: boolean;
  apiKey: string;
  senderId: string;
  otpMessage: string;
  /**
   * When true, an automatic "order received" SMS is sent to the customer as
   * soon as their order is successfully placed. Independent of the OTP
   * auto-confirmation toggle (`enabled`) but reuses the same `apiKey`/
   * `senderId` credentials.
   */
  confirmEnabled: boolean;
  /**
   * Template for the order-received SMS. Supported placeholders:
   *   - `{name}`  → the customer's name as entered at checkout,
   *   - `{items}` → comma-separated list of `Product x qty` lines,
   *   - `{total}` → grand total (products + shipping) formatted in DT.
   * Per the requirement, the order number is intentionally not included.
   */
  confirmMessage: string;
}

export const WINSMS_SENDER_ID_RE = /^[A-Za-z0-9 _-]{1,11}$/;
export const WINSMS_DEFAULT_OTP_MESSAGE =
  "Votre code de confirmation TOPPACK est : {code}";
export const WINSMS_DEFAULT_CONFIRM_MESSAGE =
  "Bonjour {name}, votre commande TOPPACK ({items}) d'un montant de {total} a bien été reçue. Merci pour votre confiance !";

export function defaultWinSmsSettings(): WinSmsSettings {
  return {
    enabled: false,
    apiKey: "",
    senderId: "",
    otpMessage: WINSMS_DEFAULT_OTP_MESSAGE,
    confirmEnabled: false,
    confirmMessage: WINSMS_DEFAULT_CONFIRM_MESSAGE,
  };
}

export function normaliseWinSmsSettings(input: unknown): WinSmsSettings {
  const defaults = defaultWinSmsSettings();
  if (!input || typeof input !== "object") return defaults;
  const r = input as Record<string, unknown>;
  const rawSender = trimString(r.senderId, 11);
  const senderId = WINSMS_SENDER_ID_RE.test(rawSender) ? rawSender : "";
  const apiKey = trimString(r.apiKey, 200);
  const otpMessage = trimString(r.otpMessage, 320) || defaults.otpMessage;
  const confirmMessage = trimString(r.confirmMessage, 320) || defaults.confirmMessage;
  // The feature is only meaningful when both an api key and a sender id are
  // configured. Refuse to enable it otherwise so the customer never sees a
  // button that would always fail.
  const enabled = r.enabled === true && !!apiKey && !!senderId;
  // Same gate for the order-received auto SMS: needs working credentials.
  const confirmEnabled = r.confirmEnabled === true && !!apiKey && !!senderId;
  return { enabled, apiKey, senderId, otpMessage, confirmEnabled, confirmMessage };
}

// ---------------------------------------------------------------------------
// Mes Colis Express (shipping company) section
// ---------------------------------------------------------------------------

/**
 * Configuration for the optional integration with Mes Colis Express
 * (https://api.mescolis.tn). Used by the admin "Synchroniser avec la
 * compagnie de livraison" button to push every confirmed order to the
 * shipping company in one click.
 *
 * - `enabled` toggles the feature in the admin UI. When false the sync
 *   button is hidden and the sync API rejects calls.
 * - `apiToken` is the `x-access-token` provided by the Mes Colis Express
 *   administrator. It is stored server-side only and is **never** exposed
 *   through `/api/site-settings/public`.
 *
 * The optional fields in the create-order payload (Tel2, exchange,
 * open_ordre) are kept off by default — they can be tweaked per-order via
 * the order notes if needed.
 */
export interface MesColisSettings {
  enabled: boolean;
  apiToken: string;
}

export function defaultMesColisSettings(): MesColisSettings {
  return { enabled: false, apiToken: "" };
}

export function normaliseMesColisSettings(input: unknown): MesColisSettings {
  const defaults = defaultMesColisSettings();
  if (!input || typeof input !== "object") return defaults;
  const r = input as Record<string, unknown>;
  const apiToken = trimString(r.apiToken, 500);
  // The feature is only meaningful when an api token is configured.
  const enabled = r.enabled === true && !!apiToken;
  return { enabled, apiToken };
}

// ---------------------------------------------------------------------------
// Live chat section
// ---------------------------------------------------------------------------

/**
 * Configuration for the optional storefront live-chat widget.
 *
 * - `enabled` toggles the floating chat bubble on the public site. When
 *   false the widget is not rendered at all.
 * - `botMode` makes the widget answer automatically using the predefined
 *   Q&A list below. When false, the widget still accepts messages but only
 *   shows a generic "we'll get back to you" acknowledgement (since there
 *   is no live agent backend in this app).
 * - `welcomeMessage` is the first message displayed when the panel opens.
 * - `qa` is the list of standard questions and replies used by the bot.
 *   Exactly `CHAT_QA_COUNT` entries are stored; missing/extra ones are
 *   filled in or trimmed by the normaliser so the admin form always has a
 *   stable shape to edit.
 */
export const CHAT_QA_COUNT = 5;

export interface ChatQAPair {
  question: string;
  answer: string;
}

export interface ChatSettings {
  enabled: boolean;
  botMode: boolean;
  welcomeMessage: string;
  qa: ChatQAPair[];
}

export const CHAT_DEFAULT_WELCOME =
  "Bonjour ! Comment pouvons-nous vous aider aujourd'hui ?";

const CHAT_DEFAULT_QA: ChatQAPair[] = [
  {
    question: "Quels sont vos délais de livraison ?",
    answer:
      "Nos commandes sont expédiées sous 24 à 48 heures ouvrées et livrées en 2 à 4 jours partout en Tunisie.",
  },
  {
    question: "Quels modes de paiement acceptez-vous ?",
    answer:
      "Nous acceptons le paiement à la livraison ainsi que le virement bancaire. Le paiement par carte sera bientôt disponible.",
  },
  {
    question: "Proposez-vous des prix de gros ?",
    answer:
      "Oui, nous proposons des tarifs dégressifs pour les commandes en gros. Contactez-nous via le formulaire de devis pour recevoir une offre personnalisée.",
  },
  {
    question: "Comment suivre ma commande ?",
    answer:
      "Une fois votre commande confirmée, vous recevez un numéro de suivi. Vous pouvez aussi consulter l'état de votre commande depuis votre espace client.",
  },
  {
    question: "Comment vous contacter ?",
    answer:
      "Vous pouvez nous joindre via la page Contact, par e-mail ou par téléphone aux horaires d'ouverture indiqués en bas de page.",
  },
];

export function defaultChatSettings(): ChatSettings {
  return {
    enabled: false,
    botMode: true,
    welcomeMessage: CHAT_DEFAULT_WELCOME,
    qa: CHAT_DEFAULT_QA.map((p) => ({ ...p })),
  };
}

export function normaliseChatSettings(input: unknown): ChatSettings {
  const defaults = defaultChatSettings();
  if (!input || typeof input !== "object") return defaults;
  const r = input as Record<string, unknown>;
  const welcomeMessage =
    trimString(r.welcomeMessage, 280) || defaults.welcomeMessage;

  const incoming = Array.isArray(r.qa) ? r.qa : [];
  const qa: ChatQAPair[] = [];
  for (let i = 0; i < CHAT_QA_COUNT; i += 1) {
    const raw = incoming[i];
    const fallback = defaults.qa[i];
    if (!raw || typeof raw !== "object") {
      qa.push({ ...fallback });
      continue;
    }
    const rec = raw as Record<string, unknown>;
    const question = trimString(rec.question, 200) || fallback.question;
    const answer = trimString(rec.answer, 600) || fallback.answer;
    qa.push({ question, answer });
  }

  return {
    enabled: r.enabled === true,
    botMode: r.botMode !== false, // default true so the widget is always useful
    welcomeMessage,
    qa,
  };
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
  devis: DevisFormSettings;
  liveEdits: LiveEditsSettings;
  boxComparator: BoxComparatorSettings;
  winsms: WinSmsSettings;
  mescolis: MesColisSettings;
  chat: ChatSettings;
}

export function defaultSiteSettings(): SiteSettings {
  return {
    checkout: defaultCheckoutSettings(),
    contact: defaultContactInfo(),
    integrations: defaultIntegrationsSettings(),
    account: defaultAccountSettings(),
    branding: defaultBrandingSettings(),
    shipping: defaultShippingSettings(),
    devis: defaultDevisFormSettings(),
    liveEdits: defaultLiveEditsSettings(),
    boxComparator: defaultBoxComparatorSettings(),
    winsms: defaultWinSmsSettings(),
    mescolis: defaultMesColisSettings(),
    chat: defaultChatSettings(),
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
    devis: normaliseDevisFormSettings(r.devis),
    liveEdits: normaliseLiveEditsSettings(r.liveEdits),
    boxComparator: normaliseBoxComparatorSettings(r.boxComparator),
    winsms: normaliseWinSmsSettings(r.winsms),
    mescolis: normaliseMesColisSettings(r.mescolis),
    chat: normaliseChatSettings(r.chat),
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
