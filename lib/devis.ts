/**
 * "Demande de devis" (quote request) data model.
 *
 * The upstream api-gateway has no native quote-request entity, so we reuse the
 * same hidden-category side-channel pattern already used for `__settings__`:
 * each devis is persisted as a category whose name starts with `__devis__:`
 * and whose `description` carries a sentinel-wrapped JSON document with all
 * the form fields. The hidden prefix is filtered out of public/admin category
 * listings in `lib/api-client.ts`.
 *
 * The category id is the devis id, and the category's "name" field embeds the
 * created-at ISO timestamp so list/sort operations don't have to fetch each
 * category individually.
 */

// ---------------------------------------------------------------------------
// Domain options shown in the form
// ---------------------------------------------------------------------------

/** Standard FEFCO carton models supported by the form. The "autre" sentinel
 * lets the customer free-text a model not in this list. */
export const FEFCO_MODELS = [
  "FEFCO 0201",
  "FEFCO 0203",
  "FEFCO 0215",
  "FEFCO 0421",
  "FEFCO 0427",
  "FEFCO 0471",
  "FEFCO 0713",
  "Autre",
] as const;
export type FefcoModel = (typeof FEFCO_MODELS)[number];

export const ONDULATION_OPTIONS = ["simple", "double"] as const;
export type Ondulation = (typeof ONDULATION_OPTIONS)[number];

export function ondulationLabel(o: Ondulation): string {
  return o === "simple" ? "Simple cannelure" : "Double cannelure";
}

/** Cannelure types. BE / BC are common double-wall combinations. */
export const CANNELURE_TYPES = ["E", "B", "C", "BE", "BC"] as const;
export type Cannelure = (typeof CANNELURE_TYPES)[number];

export const CARTON_COLORS = ["blanc", "marron"] as const;
export type CartonColor = (typeof CARTON_COLORS)[number];

export function cartonColorLabel(c: CartonColor): string {
  return c === "blanc" ? "Blanc" : "Marron";
}

// ---------------------------------------------------------------------------
// Status workflow
// ---------------------------------------------------------------------------

export const DEVIS_STATUSES = [
  "nouveau",
  "en_cours",
  "repondu",
  "accepte",
  "refuse",
  "annule",
] as const;
export type DevisStatus = (typeof DEVIS_STATUSES)[number];

const DEVIS_STATUS_LABELS: Record<DevisStatus, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  repondu: "Répondu",
  accepte: "Accepté",
  refuse: "Refusé",
  annule: "Annulé",
};

export function devisStatusLabel(s: string): string {
  if ((DEVIS_STATUSES as readonly string[]).includes(s)) {
    return DEVIS_STATUS_LABELS[s as DevisStatus];
  }
  return s;
}

// ---------------------------------------------------------------------------
// Devis document
// ---------------------------------------------------------------------------

export interface DevisRequest {
  /** Customer-facing reference (set by the server on create). */
  reference?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company: string;

  model: string;
  /** Free-text variant when `model === "Autre"`. */
  modelOther?: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  ondulation: Ondulation;
  cannelure: Cannelure;
  color: CartonColor;
  /** Whether the customer wants printing on the carton. */
  printing: boolean;
  /** Reference to the uploaded logo, if any. Stored as `/api/files/<id>`. */
  logoUrl?: string;
  logoFileName?: string;
  quantity: number;
  message?: string;
}

/** Stored representation: the form payload plus admin-controlled fields. */
export interface DevisRecord extends DevisRequest {
  id: string;
  createdAt: string; // ISO timestamp
  status: DevisStatus;
  /** Free-form internal notes editable by the admin. */
  internalNotes: string;
}

// ---------------------------------------------------------------------------
// Hidden-category encoding
// ---------------------------------------------------------------------------

/** Prefix used for the hidden-category records that store devis. */
export const DEVIS_NAME_PREFIX = "__devis__:";

/** Sentinel embedded in the category description so we can distinguish a
 * devis payload from any other text that may live in a category description. */
const DEVIS_MARKER_START = "TOPPACK_DEVIS:";
const DEVIS_MARKER_END = ":END_DEVIS";

/**
 * Build the hidden category `name` for a given devis. The name embeds the
 * creation timestamp so the admin list page can sort newest-first without
 * having to read each description.
 */
export function buildDevisCategoryName(createdAt: string): string {
  // Replace characters that the api-gateway might normalise.
  return `${DEVIS_NAME_PREFIX}${createdAt}`;
}

export function isDevisCategoryName(name: string | null | undefined): boolean {
  return !!name && name.startsWith(DEVIS_NAME_PREFIX);
}

export function extractCreatedAtFromName(name: string): string {
  if (!isDevisCategoryName(name)) return "";
  return name.slice(DEVIS_NAME_PREFIX.length);
}

/** Pack a devis payload into the category `description` field. */
export function packDevisDescription(record: Omit<DevisRecord, "id">): string {
  // Strip the (id, createdAt) — those are encoded in the category id/name.
  const { createdAt: _ignored, ...rest } = record;
  void _ignored;
  return `${DEVIS_MARKER_START}${JSON.stringify(rest)}${DEVIS_MARKER_END}`;
}

/** Read back the JSON payload from a category description, returning null
 * when the description is missing/malformed. */
export function unpackDevisDescription(
  raw: string | null | undefined
): Omit<DevisRecord, "id" | "createdAt"> | null {
  if (!raw) return null;
  const start = raw.indexOf(DEVIS_MARKER_START);
  if (start === -1) return null;
  const tail = raw.slice(start + DEVIS_MARKER_START.length);
  const end = tail.lastIndexOf(DEVIS_MARKER_END);
  if (end === -1) return null;
  const json = tail.slice(0, end);
  try {
    const parsed = JSON.parse(json) as Partial<DevisRecord>;
    return normaliseDevisPayload(parsed);
  } catch {
    return null;
  }
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asBoolean(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  return fallback;
}

function pickStatus(v: unknown): DevisStatus {
  return pickEnum(v, DEVIS_STATUSES, "nouveau");
}

/** Coerce an arbitrary JSON blob into the `DevisRecord` shape (minus id/createdAt). */
export function normaliseDevisPayload(
  raw: Partial<DevisRecord>
): Omit<DevisRecord, "id" | "createdAt"> {
  return {
    reference: asString(raw.reference) || undefined,
    customerName: asString(raw.customerName),
    customerEmail: asString(raw.customerEmail),
    customerPhone: asString(raw.customerPhone),
    company: asString(raw.company),
    model: asString(raw.model) || FEFCO_MODELS[0],
    modelOther: asString(raw.modelOther) || undefined,
    lengthCm: asNumber(raw.lengthCm),
    widthCm: asNumber(raw.widthCm),
    heightCm: asNumber(raw.heightCm),
    ondulation: pickEnum(raw.ondulation, ONDULATION_OPTIONS, "simple"),
    cannelure: pickEnum(raw.cannelure, CANNELURE_TYPES, "B"),
    color: pickEnum(raw.color, CARTON_COLORS, "marron"),
    printing: asBoolean(raw.printing),
    logoUrl: asString(raw.logoUrl) || undefined,
    logoFileName: asString(raw.logoFileName) || undefined,
    quantity: Math.max(1, Math.floor(asNumber(raw.quantity))),
    message: asString(raw.message) || undefined,
    status: pickStatus(raw.status),
    internalNotes: asString(raw.internalNotes),
  };
}

/** Resolve the displayed model name (handles the "Autre" free-text). */
export function displayModel(record: Pick<DevisRecord, "model" | "modelOther">): string {
  if (record.model === "Autre" && record.modelOther) {
    return `Autre — ${record.modelOther}`;
  }
  return record.model;
}
