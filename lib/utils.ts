export function formatPrice(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Order statuses match the api-gateway webapp (lowercase).
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH_ON_DELIVERY", "BANK_TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function paymentMethodLabel(p: string | null | undefined): string {
  if (p === "CASH_ON_DELIVERY") return "Cash on Delivery";
  if (p === "BANK_TRANSFER") return "Bank Transfer";
  return p || "—";
}

export function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
