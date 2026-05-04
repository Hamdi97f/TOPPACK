import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS } from "./utils";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
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
  imageUrl: z.string().max(500).optional().nullable(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  categoryId: z.string().min(1),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
});

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(10000),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2).max(200),
  customerEmail: z.string().email().max(200),
  customerPhone: z.string().min(3).max(50),
  addressLine: z.string().min(2).max(300),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(30),
  country: z.string().min(1).max(100),
  notes: z.string().max(2000).optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: z.array(checkoutItemSchema).min(1).max(100),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const userUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["CUSTOMER", "ADMIN"]).optional(),
});
