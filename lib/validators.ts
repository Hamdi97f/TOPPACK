import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS } from "./utils";
import type { CheckoutSettings } from "./checkout-settings";
import {
  CANNELURE_TYPES,
  CARTON_COLORS,
  DEVIS_STATUSES,
  FEFCO_MODELS,
  ONDULATION_OPTIONS,
} from "./devis";

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

/**
 * Schema used by the admin "manual order" form. Requirements are looser than
 * the customer-facing checkout — no field is forced visible/required, the
 * admin chooses an initial status, and `paymentMethod` is constrained to the
 * canonical list (not the storefront-visible subset). Pricing is recomputed
 * server-side: `unit_price` from the client is always discarded.
 */
export const adminOrderCreateSchema = z.object({
  customerName: z.string().trim().max(200).optional().default(""),
  customerEmail: z
    .union([z.string().trim().email().max(200), z.literal("")])
    .optional()
    .default(""),
  customerPhone: z.string().trim().max(50).optional().default(""),
  addressLine: z.string().trim().max(300).optional().default(""),
  city: z.string().trim().max(100).optional().default(""),
  postalCode: z.string().trim().max(30).optional().default(""),
  country: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH_ON_DELIVERY"),
  status: z.enum(ORDER_STATUSES).optional(),
  items: z.array(checkoutItemSchema).min(1).max(100),
});

// ---------------------------------------------------------------------------
// Demande de devis (quote request)
// ---------------------------------------------------------------------------

/**
 * Schema for the public-facing quote request form. Field constraints are kept
 * loose where it makes sense (the customer doesn't always know exact values)
 * but every input is bounded to keep the upstream payload small and prevent
 * abuse.
 */
export const devisRequestSchema = z
  .object({
    customerName: z.string().trim().min(2, "Nom requis").max(200),
    customerEmail: z.string().trim().email("E-mail invalide").max(200),
    customerPhone: z.string().trim().min(3, "Téléphone requis").max(50),
    company: z.string().trim().max(200).optional().default(""),
    model: z.enum(FEFCO_MODELS),
    modelOther: z.string().trim().max(200).optional().default(""),
    lengthCm: z.coerce.number().positive("Longueur requise").max(10000),
    widthCm: z.coerce.number().positive("Largeur requise").max(10000),
    heightCm: z.coerce.number().positive("Hauteur requise").max(10000),
    ondulation: z.enum(ONDULATION_OPTIONS),
    cannelure: z.enum(CANNELURE_TYPES),
    color: z.enum(CARTON_COLORS),
    printing: z.coerce.boolean().optional().default(false),
    logoUrl: z
      .string()
      .max(500)
      .refine(
        (v) => v === "" || v.startsWith("/api/files/"),
        "Le logo doit être téléversé via le formulaire."
      )
      .optional()
      .default(""),
    logoFileName: z.string().trim().max(200).optional().default(""),
    quantity: z.coerce.number().int().positive("Quantité requise").max(10_000_000),
    message: z.string().trim().max(2000).optional().default(""),
  })
  .superRefine((val, ctx) => {
    if (val.model === "Autre" && !val.modelOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modelOther"],
        message: "Précisez le modèle souhaité.",
      });
    }
  });

export type DevisRequestInput = z.infer<typeof devisRequestSchema>;

export const devisStatusUpdateSchema = z.object({
  status: z.enum(DEVIS_STATUSES).optional(),
  internalNotes: z.string().max(5000).optional(),
});
