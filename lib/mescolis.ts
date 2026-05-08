/**
 * Thin wrapper around the Mes Colis Express shipping API
 * (https://api.mescolis.tn). Used by the admin "Synchroniser avec la
 * compagnie de livraison" action to push every confirmed order to the
 * shipping company in one click.
 *
 * All endpoints expect:
 *   - `Content-Type: application/json`
 *   - `x-access-token: <token>` provided by the Mes Colis Express
 *     administrator (stored in `SiteSettings.mescolis.apiToken`).
 *
 * The API documentation lists three endpoints (Create / GetOrder /
 * DeleteOrder); only `Create` is exercised by the sync flow today, but
 * the others are exposed here for completeness and so future admin
 * actions (tracking / cancellation) can reuse the same client.
 */

import { TUNISIA_GOVERNORATES, isTunisiaGovernorate } from "./tunisia-governorates";

export const MESCOLIS_BASE_URL = "https://api.mescolis.tn/api";

export interface MesColisCreateOrderInput {
  product_name: string;
  client_name: string;
  address: string;
  /** Must be one of the 24 Tunisian governorates accepted by Mes Colis. */
  gouvernerate: string;
  /** Sub-locality / city. Falls back to the gouvernerate when unknown. */
  city: string;
  /** Free-text point of reference / landmark. */
  location: string;
  Tel1: string;
  Tel2?: string;
  /** Cash to collect on delivery, in DT. */
  price: number;
  /** "1" for an exchange order, "0" otherwise. */
  exchange?: "0" | "1";
  /** "1" if the recipient is allowed to open the package before paying. */
  open_ordre?: "0" | "1";
  note?: string;
}

export interface MesColisCreateOrderResponse {
  /** Returned on success — to be persisted on the order so we never re-sync. */
  barcode?: string;
  /** Some error responses use these instead. */
  error?: string;
  message?: string;
  code?: string;
  // The exact response shape isn't fully documented; carry through any extras.
  [key: string]: unknown;
}

export class MesColisError extends Error {
  status: number;
  code: string | null;
  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function ensureToken(token: string | null | undefined): string {
  const t = (token ?? "").trim();
  if (!t) {
    throw new MesColisError(
      400,
      "Aucun jeton Mes Colis Express n'est configuré.",
      "NO_TOKEN_PROVIDED"
    );
  }
  return t;
}

async function call<T>(
  token: string,
  method: "POST" | "DELETE",
  path: string,
  body: unknown
): Promise<T> {
  const res = await fetch(`${MESCOLIS_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const obj = (data && typeof data === "object" ? (data as Record<string, unknown>) : {}) as Record<string, unknown>;
    const code = typeof obj.code === "string" ? obj.code : null;
    const message =
      (typeof obj.message === "string" && obj.message) ||
      (typeof obj.error === "string" && obj.error) ||
      `Mes Colis Express a renvoyé HTTP ${res.status}`;
    throw new MesColisError(res.status, message, code);
  }
  return data as T;
}

/**
 * Sanitise a free-text field so it fits inside the Mes Colis JSON payload.
 * The upstream API does not document a maximum length; we cap conservatively
 * to avoid a 500 from oversized strings and strip line breaks (the JSON spec
 * accepts them but the upstream parser has been known to choke on them).
 */
function clean(value: string | null | undefined, max = 200): string {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, max);
}

/** Resolve the governorate from a free-text city/governorate value. */
export function resolveGouvernerate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isTunisiaGovernorate(trimmed)) return trimmed;
  // Case-insensitive fallback so legacy orders saved with different casing
  // still match. Accents must already match — the canonical list is the
  // authoritative spelling.
  const lower = trimmed.toLowerCase();
  const match = (TUNISIA_GOVERNORATES as readonly string[]).find(
    (g) => g.toLowerCase() === lower
  );
  return match ?? null;
}

export const mesColisClient = {
  async createOrder(
    token: string,
    input: MesColisCreateOrderInput
  ): Promise<MesColisCreateOrderResponse> {
    const t = ensureToken(token);
    const gouvernerate = resolveGouvernerate(input.gouvernerate);
    if (!gouvernerate) {
      throw new MesColisError(
        400,
        `Gouvernorat « ${input.gouvernerate} » non reconnu.`,
        "CITY_NOT_FOUND"
      );
    }
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new MesColisError(400, "Prix invalide.", "ERROR_ADDING_ORDER");
    }
    const payload = {
      product_name: clean(input.product_name) || "Commande",
      client_name: clean(input.client_name) || "Client",
      address: clean(input.address, 500) || "Non renseignée",
      gouvernerate,
      city: clean(input.city) || gouvernerate,
      location: clean(input.location, 200),
      Tel1: clean(input.Tel1, 30),
      Tel2: clean(input.Tel2, 30),
      price,
      exchange: input.exchange === "1" ? "1" : "0",
      open_ordre: input.open_ordre === "1" ? "1" : "0",
      note: clean(input.note, 500),
    };
    if (!payload.Tel1) {
      throw new MesColisError(
        400,
        "Téléphone du client manquant.",
        "ERROR_ADDING_ORDER"
      );
    }
    return call<MesColisCreateOrderResponse>(t, "POST", "/orders/Create", payload);
  },

  async getOrder(token: string, barcode: string): Promise<{ barcode?: string; status?: string } & Record<string, unknown>> {
    const t = ensureToken(token);
    if (!barcode) {
      throw new MesColisError(400, "Barcode manquant.", "BARCODE_REQUIRED");
    }
    return call(t, "POST", "/orders/GetOrder", { barcode });
  },

  async deleteOrder(token: string, barcode: string): Promise<{ success?: boolean; message?: string }> {
    const t = ensureToken(token);
    if (!barcode) {
      throw new MesColisError(400, "Barcode manquant.", "BARCODE_REQUIRED");
    }
    return call(t, "DELETE", "/orders/DeleteOrder", { barcode });
  },
};

/**
 * Pull a barcode out of a possibly-shaped Mes Colis response. The upstream
 * documentation only specifies the success body for `GetOrder` ({barcode,
 * status}); the create endpoint is documented to return the barcode but
 * the exact key is not fixed across deployments — accept the most common
 * variants so we never silently drop a successful sync.
 */
export function extractBarcode(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const r = response as Record<string, unknown>;
  for (const key of ["barcode", "Barcode", "BARCODE", "code_barre", "tracking", "tracking_number"]) {
    const v = r[key];
    if (typeof v === "string" && /^[A-Za-z0-9_-]+$/.test(v)) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  // Some APIs nest the barcode inside `data` / `order`.
  for (const key of ["data", "order", "result"]) {
    if (r[key] && typeof r[key] === "object") {
      const nested = extractBarcode(r[key]);
      if (nested) return nested;
    }
  }
  return null;
}
