import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import {
  apiClient,
  buildOrderNotes,
  buildShippingAddress,
  parseOrderNotes,
  parseShippingAddress,
} from "@/lib/api-client";
import { adminOrderUpdateSchema, orderStatusUpdateSchema } from "@/lib/validators";

// The api-gateway uses PUT to update orders. We accept both PATCH (used by
// the in-app status dropdown which sends just `{ status }`) and PUT (used by
// the full "edit order" form which sends every field). The two payloads are
// distinguished by shape: a body that only contains `status` validates with
// `orderStatusUpdateSchema`; anything richer goes through
// `adminOrderUpdateSchema`.
async function updateOrder(req: Request, id: string) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const token = session.user.apiToken;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Fast path: status-only update. Keeps the simple PATCH from the status
  // dropdown lightweight (no need to fetch the existing order).
  const isStatusOnly =
    body && typeof body === "object" && Object.keys(body as object).length === 1 && "status" in (body as object);
  if (isStatusOnly) {
    const parsed = orderStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    try {
      const order = await apiClient.updateOrder(token, id, { status: parsed.data.status });
      return NextResponse.json({ order });
    } catch (err) {
      return apiErrorResponse(err, "Échec de la mise à jour de la commande");
    }
  }

  const parsed = adminOrderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données de commande invalides" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Load the existing order so we can merge unspecified fields and rebuild
  // the packed `notes` / `shipping_address` strings without losing values
  // the form did not touch.
  let existing;
  try {
    existing = await apiClient.getOrder(token, id);
  } catch (err) {
    return apiErrorResponse(err, "Commande introuvable");
  }
  const existingNotes = parseOrderNotes(existing.notes);
  const existingShipping = parseShippingAddress(existing.shipping_address);

  // Merge: a field is only overwritten when the client explicitly sent it.
  const customerName = data.customerName ?? existing.customer_name ?? "";
  const customerEmail = data.customerEmail ?? existing.customer_email ?? "";
  const customerPhone = data.customerPhone ?? existingShipping.customerPhone;
  const addressLine = data.addressLine ?? existingShipping.addressLine;
  const city = data.city ?? existingShipping.city;
  const postalCode = data.postalCode ?? existingShipping.postalCode;
  const country = data.country ?? existingShipping.country;
  const paymentMethod = data.paymentMethod ?? existingNotes.paymentMethod ?? "CASH_ON_DELIVERY";
  const shippingFee =
    data.shippingFee !== undefined ? data.shippingFee : existingNotes.shippingFee;
  const mescolisBarcode =
    data.mescolisBarcode !== undefined ? data.mescolisBarcode : existingNotes.mescolisBarcode;
  const noteText = data.notes ?? existingNotes.text.trim();

  const updateBody: Parameters<typeof apiClient.updateOrder>[2] = {
    customer_name: customerName,
    customer_email: customerEmail,
    shipping_address: buildShippingAddress({
      customerPhone,
      addressLine,
      city,
      postalCode,
      country,
    }),
    notes: buildOrderNotes(paymentMethod, noteText || null, shippingFee, mescolisBarcode),
  };
  if (data.status) updateBody.status = data.status;

  if (data.items) {
    // Default behaviour matches order creation: forward only product_id +
    // quantity so the api-gateway recomputes pricing from the catalog.
    // `overridePrice` lets the admin pin a specific unit price (used for
    // discounts, manual adjustments, etc.).
    updateBody.items = data.items.map((it) => {
      const item: { product_id: string; quantity: number; unit_price?: number } = {
        product_id: it.productId,
        quantity: it.quantity,
      };
      if (it.overridePrice && it.unitPriceOverride !== null) {
        item.unit_price = it.unitPriceOverride;
      }
      return item;
    });
  }

  try {
    const order = await apiClient.updateOrder(token, id, updateBody);
    return NextResponse.json({ order });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la mise à jour de la commande");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateOrder(req, id);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateOrder(req, id);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  try {
    const result = await apiClient.deleteOrder(session.user.apiToken, id);
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err, "Échec de la suppression de la commande");
  }
}
