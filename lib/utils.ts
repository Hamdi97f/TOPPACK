// Prices are denominated in Tunisian Dinars (DT). The dinar is conventionally
// quoted with 3 decimal places (millimes), so both display and input use 3
// fractional digits. We render the symbol manually as "DT" because that is the
// usual local notation in French Tunisian usage (Intl would print "TND").
// The `currency` parameter is accepted for backwards compatibility with
// previous call sites and is intentionally ignored.
export function formatPrice(value: number, _currency: string = "TND"): string { // eslint-disable-line no-unused-vars
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
  return `${formatted} DT`;
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
  if (p === "CASH_ON_DELIVERY") return "Paiement à la livraison";
  if (p === "BANK_TRANSFER") return "Virement bancaire";
  return p || "—";
}

const ORDER_STATUS_LABELS_FR: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export function statusLabel(s: string): string {
  return ORDER_STATUS_LABELS_FR[s.toLowerCase()] ?? (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
}
