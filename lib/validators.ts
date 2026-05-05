import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS } from "./utils";
import type { CheckoutSettings } from "./checkout-settings";

export const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export const productSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1).max(5000),
  sku: z.string().min(1).max(100),
  lengthCm: z.coerce.number().positive().max(10000),
  widthCm: z.coerce.number().positive().max(10000),
  heightCm: z.coerce.number().positive().max(10000),
  wallType: z.string().min(1).max(100),
  price: z.coerce.number().nonnegative().max(1_000_000),
  stock: z.coerce.number().int().nonnegative().max(10_000_000),
  imageUrl: z
    .string()
    .max(500)
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/api/files/"),
      "L'URL de l'image doit être absolue (http/https) ou pointer vers /api/files/…"
    )
    .optional()
    .nullable(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  categoryId: z.string().min(1),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional().nullable(),
});

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(10000),
});

/**
 * Build the order-creation Zod schema from the admin's checkout configuration.
 * - Hidden fields are coerced to empty strings (the form never submits them).
 * - Required fields keep their per-field minimum length / format constraints.
 * - Optional fields accept empty strings.
 * - The payment method is constrained to the admin-enabled subset.
 *
 * The settings are always re-read server-side; the client never controls which
 * fields are required.
 */
export function buildCheckoutSchema(settings: CheckoutSettings) {
  const reqByKey = new Map(settings.fields.map((f) => [f.field, f]));
  const allowedMethods = settings.paymentMethods.length
    ? settings.paymentMethods
    : PAYMENT_METHODS;

  // Per-field rules when the field is *required*. Optional/hidden cases relax
  // the constraints to "an optional, capped string" so empty submissions are
  // accepted.
  const REQUIRED_RULES = {
    customerName: z.string().trim().min(2).max(200),
    customerEmail: z.string().trim().email().max(200),
    customerPhone: z.string().trim().min(3).max(50),
    addressLine: z.string().trim().min(2).max(300),
    city: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(30),
    country: z.string().trim().min(1).max(100),
    notes: z.string().trim().min(1).max(2000),
  } as const;
  const MAX_LEN = {
    customerName: 200, customerEmail: 200, customerPhone: 50,
    addressLine: 300, city: 100, postalCode: 30, country: 100, notes: 2000,
  } as const;

  function fieldFor(key: keyof typeof REQUIRED_RULES) {
    const conf = reqByKey.get(key);
    const visible = conf ? conf.visible : true;
    const required = visible && conf?.required === true;
    if (required) return REQUIRED_RULES[key];
    // Optional or hidden: accept missing/empty strings, but cap length.
    return z
      .union([z.string().max(MAX_LEN[key]), z.literal(""), z.undefined(), z.null()])
      .transform((v) => (typeof v === "string" ? v : ""));
  }

  return z.object({
    customerName: fieldFor("customerName"),
    customerEmail: fieldFor("customerEmail"),
    customerPhone: fieldFor("customerPhone"),
    addressLine: fieldFor("addressLine"),
    city: fieldFor("city"),
    postalCode: fieldFor("postalCode"),
    country: fieldFor("country"),
    notes: fieldFor("notes"),
    paymentMethod: z.enum(PAYMENT_METHODS).refine(
      (m) => (allowedMethods as readonly string[]).includes(m),
      "Mode de paiement non autorisé"
    ),
    items: z.array(checkoutItemSchema).min(1).max(100),
  });
}

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
