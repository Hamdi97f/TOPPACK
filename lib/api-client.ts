/**
 * Typed wrapper around the api-gateway webapp.
 *
 * Two authentication contexts are supported:
 *
 *  - Authenticated user: the caller passes an explicit bearer `token` which
 *    was issued by `POST /login` (and stored in the NextAuth JWT).
 *  - Anonymous public reads: callers omit `token`; the wrapper transparently
 *    obtains and caches a bearer token by logging in as the
 *    `TOPPACK_SERVICE_EMAIL` / `TOPPACK_SERVICE_PASSWORD` service account.
 *
 * The remote schema is leaner than TOPPACK's original Prisma schema, so a
 * couple of fields are shimmed:
 *
 *  - `Product` extras (sku, dimensions, wallType, slug, isFeatured) are packed
 *    as a JSON tail at the end of the `description` field, separated from the
 *    free-text body by a sentinel marker. Helpers below pack/unpack them.
 *  - `Category.slug` is derived from `name` via slugify and not persisted.
 *  - `Order.paymentMethod` is encoded as a leading "PAYMENT: …" line in
 *    `notes`. The shipping address is a single string composed of the
 *    customer's phone, address line, city, postal code and country.
 */

import type {
  ApiCategory,
  ApiLoginResponse,
  ApiOrder,
  ApiProduct,
  ApiUploadResponse,
  ApiUser,
} from "@/types/api";
import { slugify } from "@/lib/utils";
import {
  CheckoutSettings,
  defaultCheckoutSettings,
  packSettingsDescription,
  SETTINGS_CATEGORY_NAME,
  unpackSettingsDescription,
} from "@/lib/checkout-settings";
import {
  defaultSiteSettings,
  packSiteSettings,
  SiteSettings,
  unpackSiteSettings,
} from "@/lib/site-settings";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://hycvkzijiwnmcwejvugj.supabase.co/functions/v1/api-gateway";

function baseUrl(): string {
  return process.env.TOPPACK_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE_URL;
}

function apiKey(): string {
  const k = process.env.TOPPACK_API_KEY;
  if (!k) throw new ApiError(500, "TOPPACK_API_KEY environment variable is not set");
  return k;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Low-level fetch helper
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  token?: string | null;
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | undefined>;
  /**
   * Optional Next.js fetch cache directive. Defaults to `"no-store"` so that
   * mutations and authenticated reads always hit the upstream gateway.
   * Public read methods opt-in to revalidation by passing
   * `next: { revalidate, tags }` (in which case `cache` should be left unset).
   */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "x-api-key": apiKey(),
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const url = new URL(baseUrl() + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }
  // When the caller opts into Next.js fetch cache via `next: { revalidate, tags }`,
  // we must NOT pass an explicit `cache` field — the two are mutually exclusive.
  const fetchInit: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    method: opts.method || "GET",
    headers,
    body,
  };
  if (opts.next) {
    fetchInit.next = opts.next;
  } else {
    fetchInit.cache = opts.cache ?? "no-store";
  }
  const res = await fetch(url.toString(), fetchInit);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in (data as Record<string, unknown>) &&
        typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request to ${path} failed with status ${res.status}`);
    throw new ApiError(res.status, message);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Service-account token cache for public/anonymous reads
// ---------------------------------------------------------------------------

interface CachedServiceToken {
  token: string;
  // Expiry is a best-effort guess — the API does not publish a TTL, so we
  // refresh the token periodically to limit blast radius.
  refreshAt: number;
}

// Cache one token per process. Module-level state survives across requests on
// the same serverless instance.
let serviceTokenCache: CachedServiceToken | null = null;
let serviceTokenInflight: Promise<string> | null = null;
const SERVICE_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function loginServiceAccount(): Promise<string> {
  const email = process.env.TOPPACK_SERVICE_EMAIL;
  const password = process.env.TOPPACK_SERVICE_PASSWORD;
  if (!email || !password) {
    throw new ApiError(
      500,
      "TOPPACK_SERVICE_EMAIL/TOPPACK_SERVICE_PASSWORD must be configured for anonymous catalog reads"
    );
  }
  const res = await request<ApiLoginResponse>("/login", {
    method: "POST",
    body: { email, password },
  });
  return res.token;
}

export async function getServiceToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && serviceTokenCache && Date.now() < serviceTokenCache.refreshAt) {
    return serviceTokenCache.token;
  }
  // De-duplicate concurrent refreshes so a burst of public requests at cold
  // start does not trigger many parallel logins.
  if (!serviceTokenInflight) {
    serviceTokenInflight = (async () => {
      try {
        const token = await loginServiceAccount();
        serviceTokenCache = { token, refreshAt: Date.now() + SERVICE_TOKEN_TTL_MS };
        return token;
      } finally {
        serviceTokenInflight = null;
      }
    })();
  }
  return serviceTokenInflight;
}

/**
 * Issue a request with a token, automatically retrying once with a refreshed
 * service token on 401 if the caller did not supply their own token.
 */
async function authedRequest<T>(path: string, opts: RequestOptions & { token?: string | null }): Promise<T> {
  let token = opts.token;
  let usingService = false;
  if (!token) {
    token = await getServiceToken();
    usingService = true;
  }
  try {
    return await request<T>(path, { ...opts, token });
  } catch (err) {
    if (usingService && err instanceof ApiError && err.status === 401) {
      const fresh = await getServiceToken(true);
      return request<T>(path, { ...opts, token: fresh });
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public-read cache configuration
// ---------------------------------------------------------------------------

/**
 * Cache tags used by storefront read methods. Admin mutate routes must call
 * `revalidateTag(...)` with the matching tag after a successful write so that
 * customer-facing pages see updates promptly instead of waiting for the
 * timed revalidation window to elapse.
 */
export const CACHE_TAGS = {
  products: "toppack:products",
  categories: "toppack:categories",
  siteSettings: "toppack:site-settings",
} as const;

/** Time-based revalidation window (seconds) for anonymous catalog reads. */
const PUBLIC_REVALIDATE_SECONDS = 60;

/**
 * Build a `next` fetch option for an anonymous public read. Returns
 * `undefined` when an authenticated token is supplied so admin/account reads
 * remain uncached.
 */
function publicReadCache(
  token: string | null | undefined,
  tags: string[]
): { revalidate: number; tags: string[] } | undefined {
  if (token) return undefined;
  return { revalidate: PUBLIC_REVALIDATE_SECONDS, tags };
}

// ---------------------------------------------------------------------------
// Schema shims: extras packed inside Product.description and Order.notes
// ---------------------------------------------------------------------------

const PRODUCT_EXTRAS_MARKER = "\n<!--TOPPACK_EXTRAS:";
const PRODUCT_EXTRAS_END = "-->";

export interface ProductExtras {
  sku?: string;
  slug?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  wallType?: string;
  isFeatured?: boolean;
}

export function packProductDescription(text: string, extras: ProductExtras): string {
  const cleanExtras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extras)) {
    if (v !== undefined && v !== null && v !== "") cleanExtras[k] = v;
  }
  return `${text}${PRODUCT_EXTRAS_MARKER}${JSON.stringify(cleanExtras)}${PRODUCT_EXTRAS_END}`;
}

export function unpackProductDescription(raw: string | null | undefined): { text: string; extras: ProductExtras } {
  if (!raw) return { text: "", extras: {} };
  const idx = raw.lastIndexOf(PRODUCT_EXTRAS_MARKER);
  if (idx === -1) return { text: raw, extras: {} };
  const text = raw.slice(0, idx);
  const tail = raw.slice(idx + PRODUCT_EXTRAS_MARKER.length);
  const endIdx = tail.lastIndexOf(PRODUCT_EXTRAS_END);
  if (endIdx === -1) return { text, extras: {} };
  const json = tail.slice(0, endIdx);
  try {
    const extras = JSON.parse(json);
    if (extras && typeof extras === "object") return { text, extras: extras as ProductExtras };
  } catch {
    // Fall through; treat as no extras.
  }
  return { text, extras: {} };
}

export interface ProductCustomerView {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string | null;
  imageUrl: string | null;
  isActive: boolean;
  slug: string;
  sku: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  wallType: string;
  isFeatured: boolean;
}

export function adaptProduct(p: ApiProduct): ProductCustomerView {
  const { text, extras } = unpackProductDescription(p.description);
  return {
    id: p.id,
    name: p.name,
    description: text,
    price: Number(p.price ?? 0),
    stock: Number(p.stock ?? 0),
    categoryId: p.category_id,
    imageUrl: resolveImageUrl(p.image_url),
    isActive: p.is_active,
    slug: extras.slug || slugify(p.name),
    sku: extras.sku || "",
    lengthCm: extras.lengthCm ?? 0,
    widthCm: extras.widthCm ?? 0,
    heightCm: extras.heightCm ?? 0,
    wallType: extras.wallType || "",
    isFeatured: Boolean(extras.isFeatured),
  };
}

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export function adaptCategory(c: ApiCategory): CategoryView {
  return {
    id: c.id,
    name: c.name,
    slug: slugify(c.name),
    description: c.description ?? null,
  };
}

// Order-side shims --------------------------------------------------------

export interface OrderShippingFields {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string | null;
  paymentMethod: string;
}

export function buildShippingAddress(f: Pick<OrderShippingFields, "customerPhone" | "addressLine" | "city" | "postalCode" | "country">): string {
  const lines = [
    f.addressLine,
    [f.city, f.postalCode].filter(Boolean).join(" ").trim(),
    f.country,
    f.customerPhone ? `Phone: ${f.customerPhone}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildOrderNotes(paymentMethod: string, notes: string | null | undefined): string {
  const lead = `PAYMENT: ${paymentMethod}`;
  if (!notes) return lead;
  return `${lead}\n${notes}`;
}

export function parseOrderNotes(notes: string | null | undefined): { paymentMethod: string | null; text: string } {
  if (!notes) return { paymentMethod: null, text: "" };
  const m = notes.match(/^PAYMENT:\s*(\S+)\s*\n?/);
  if (!m) return { paymentMethod: null, text: notes };
  return { paymentMethod: m[1], text: notes.slice(m[0].length) };
}

export function parseShippingAddress(addr: string | null | undefined): {
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
  customerPhone: string;
} {
  const result = { addressLine: "", city: "", postalCode: "", country: "", customerPhone: "" };
  if (!addr) return result;
  const lines = addr.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    const phoneMatch = line.match(/^Phone:\s*(.+)$/i);
    if (phoneMatch) {
      result.customerPhone = phoneMatch[1].trim();
      continue;
    }
    if (!result.addressLine) {
      result.addressLine = line;
      continue;
    }
    if (!result.city) {
      // City + postal code line, e.g. "Paris 75001"
      const cm = line.match(/^(.*?)(\s+(\S+))?$/);
      if (cm) {
        result.city = (cm[1] || "").trim();
        result.postalCode = (cm[3] || "").trim();
      } else {
        result.city = line;
      }
      continue;
    }
    if (!result.country) {
      result.country = line;
      continue;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// High-level API surface
// ---------------------------------------------------------------------------

export const apiClient = {
  // Auth
  async register(email: string, password: string): Promise<{ user_id: string; email: string }> {
    return request("/register", { method: "POST", body: { email, password } });
  },
  async login(email: string, password: string): Promise<ApiLoginResponse> {
    return request("/login", { method: "POST", body: { email, password } });
  },

  // User
  async getUser(token: string): Promise<ApiUser> {
    return authedRequest("/user", { token });
  },
  async updateUser(token: string, fields: { email?: string; password?: string }): Promise<{ success: boolean }> {
    return authedRequest("/update-user", { method: "POST", token, body: fields });
  },

  // Categories
  async listCategories(token?: string | null): Promise<ApiCategory[]> {
    const r = await authedRequest<{ categories: ApiCategory[] }>("/categories", {
      token,
      next: publicReadCache(token, [CACHE_TAGS.categories]),
    });
    // Hide internal records used as side-channel storage (e.g. checkout
    // settings) so they never appear in storefront or admin category lists.
    return (r.categories || []).filter((c) => c.name !== SETTINGS_CATEGORY_NAME);
  },
  /** Internal: includes the hidden `__settings__` record. */
  async _listAllCategories(token?: string | null): Promise<ApiCategory[]> {
    const r = await authedRequest<{ categories: ApiCategory[] }>("/categories", {
      token,
      // Settings change rarely — share the categories cache and rely on
      // explicit `revalidateTag` invalidation from admin write paths.
      next: publicReadCache(token, [CACHE_TAGS.categories, CACHE_TAGS.siteSettings]),
    });
    return r.categories || [];
  },
  async createCategory(token: string, body: { name: string; description?: string | null }): Promise<ApiCategory> {
    return authedRequest("/categories", { method: "POST", token, body });
  },
  async updateCategory(token: string, id: string, body: { name?: string; description?: string | null }): Promise<ApiCategory> {
    return authedRequest(`/categories/${encodeURIComponent(id)}`, { method: "PUT", token, body });
  },
  async deleteCategory(token: string, id: string): Promise<{ success: boolean }> {
    return authedRequest(`/categories/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },

  // Products
  async listProducts(token?: string | null): Promise<ApiProduct[]> {
    const r = await authedRequest<{ products: ApiProduct[] }>("/products", {
      token,
      next: publicReadCache(token, [CACHE_TAGS.products]),
    });
    return r.products || [];
  },
  async getProduct(token: string | null | undefined, id: string): Promise<ApiProduct> {
    return authedRequest(`/products/${encodeURIComponent(id)}`, {
      token,
      next: publicReadCache(token, [CACHE_TAGS.products]),
    });
  },
  async createProduct(token: string, body: Partial<ApiProduct>): Promise<ApiProduct> {
    return authedRequest("/products", { method: "POST", token, body });
  },
  async updateProduct(token: string, id: string, body: Partial<ApiProduct>): Promise<ApiProduct> {
    return authedRequest(`/products/${encodeURIComponent(id)}`, { method: "PUT", token, body });
  },
  async deleteProduct(token: string, id: string): Promise<{ success: boolean }> {
    return authedRequest(`/products/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },

  // Orders
  async listOrders(token: string): Promise<ApiOrder[]> {
    const r = await authedRequest<{ orders: ApiOrder[] }>("/orders", { token });
    return r.orders || [];
  },
  async getOrder(token: string, id: string): Promise<ApiOrder> {
    return authedRequest(`/orders/${encodeURIComponent(id)}`, { token });
  },
  async createOrder(
    token: string,
    body: {
      customer_name: string;
      customer_email: string;
      shipping_address: string;
      notes?: string;
      items: Array<{ product_id: string; quantity: number; unit_price?: number }>;
    }
  ): Promise<ApiOrder> {
    return authedRequest("/orders", { method: "POST", token, body });
  },
  async updateOrder(
    token: string,
    id: string,
    body: { status?: string; notes?: string; items?: Array<{ product_id: string; quantity: number; unit_price?: number }> }
  ): Promise<ApiOrder> {
    return authedRequest(`/orders/${encodeURIComponent(id)}`, { method: "PUT", token, body });
  },
  async deleteOrder(token: string, id: string): Promise<{ success: boolean }> {
    return authedRequest(`/orders/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },

  // Settings (stored as a hidden category whose description carries JSON)
  async getSiteSettings(token?: string | null): Promise<SiteSettings> {
    try {
      const cats = await this._listAllCategories(token);
      const record = cats.find((c) => c.name === SETTINGS_CATEGORY_NAME);
      if (!record) return defaultSiteSettings();
      return unpackSiteSettings(record.description);
    } catch {
      return defaultSiteSettings();
    }
  },

  async setSiteSettings(token: string, settings: SiteSettings): Promise<SiteSettings> {
    const cats = await this._listAllCategories(token);
    const record = cats.find((c) => c.name === SETTINGS_CATEGORY_NAME);
    const description = packSiteSettings(settings);
    if (record) {
      await this.updateCategory(token, record.id, {
        name: SETTINGS_CATEGORY_NAME,
        description,
      });
    } else {
      await this.createCategory(token, { name: SETTINGS_CATEGORY_NAME, description });
    }
    return settings;
  },

  async getCheckoutSettings(token?: string | null): Promise<CheckoutSettings> {
    try {
      const cats = await this._listAllCategories(token);
      const record = cats.find((c) => c.name === SETTINGS_CATEGORY_NAME);
      if (!record) return defaultCheckoutSettings();
      return unpackSettingsDescription(record.description);
    } catch {
      return defaultCheckoutSettings();
    }
  },

  async setCheckoutSettings(token: string, settings: CheckoutSettings): Promise<CheckoutSettings> {
    const current = await this.getSiteSettings(token);
    await this.setSiteSettings(token, { ...current, checkout: settings });
    return settings;
  },

  // Storage
  async uploadFile(token: string, file: File): Promise<ApiUploadResponse> {
    const fd = new FormData();
    fd.append("file", file);
    return authedRequest("/upload-file", { method: "POST", token, formData: fd });
  },

  /**
   * Upload an image to the public `product-images` bucket and let the
   * api-gateway atomically set the product's `image_url` to the resulting
   * public URL. Returns the new public URL plus the updated product.
   */
  async uploadProductImage(
    token: string,
    productId: string,
    file: File
  ): Promise<{ image_url: string; product: ApiProduct }> {
    const fd = new FormData();
    fd.append("file", file);
    return authedRequest(
      `/products/${encodeURIComponent(productId)}/image`,
      { method: "POST", token, formData: fd }
    );
  },

  /**
   * Fetch a file's bytes from the api-gateway by id, returning the raw
   * `Response` so callers can stream it (e.g. proxy through a Next.js route).
   *
   * The api-gateway exposes downloads as `GET /download-file?file_id=<id>`
   * (a query parameter — *not* a path segment). Returns `null` if the file
   * is not found.
   */
  async fetchFile(token: string | null | undefined, id: string): Promise<Response | null> {
    let bearer = token;
    if (!bearer) bearer = await getServiceToken();
    const headers: Record<string, string> = {
      "x-api-key": apiKey(),
      Authorization: `Bearer ${bearer}`,
    };
    const path = `/download-file?file_id=${encodeURIComponent(id)}`;
    const res = await fetch(baseUrl() + path, { headers, cache: "no-store" });
    if (res.ok) return res;
    // Auth failures are recoverable when we minted the token ourselves.
    if (res.status === 401 && !token) {
      const fresh = await getServiceToken(true);
      const retry = await fetch(baseUrl() + path, {
        headers: { ...headers, Authorization: `Bearer ${fresh}` },
        cache: "no-store",
      });
      if (retry.ok) return retry;
      if (retry.status === 404) return null;
      throw new ApiError(retry.status, `Failed to download file ${id}`);
    }
    if (res.status === 404) return null;
    throw new ApiError(res.status, `Failed to download file ${id}`);
  },
};

// ---------------------------------------------------------------------------
// Image URL helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when `value` is a UUID-shaped string. The api-gateway used to
 * return bare file ids from `/upload-file` which were mistakenly persisted as
 * `image_url` on some products. Those values are not loadable by the browser
 * and need to be rewritten to the `/api/files/{id}` proxy URL on read.
 */
export function isFileIdLike(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

/**
 * Normalise a stored `image_url` into a value the browser can load. Absolute
 * `http(s)://` URLs and existing `/api/files/...` paths pass through. Bare
 * file ids (UUIDs) are rewritten to point at the local file proxy. Anything
 * else (including null/empty) yields `null`.
 */
export function resolveImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/api/files/")) return trimmed;
  if (isFileIdLike(trimmed)) return `/api/files/${encodeURIComponent(trimmed)}`;
  return null;
}
