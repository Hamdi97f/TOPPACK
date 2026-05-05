import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import {
  apiClient,
  buildOrderNotes,
  buildShippingAddress,
} from "@/lib/api-client";
import { adminOrderCreateSchema } from "@/lib/validators";

/**
 * Manual order creation by an administrator.
 *
 * Mirrors the storefront `/api/orders` POST but with relaxed validation
 * (no field is forced required, the admin can pick an initial status,
 * customer email is optional). Pricing and totals are still recomputed
 * upstream by the api-gateway from the product catalog — `unit_price`
 * from the client is intentionally not forwarded.
 */
export async function POST(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = adminOrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données de commande invalides" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const order = await apiClient.createOrder(session.user.apiToken, {
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      shipping_address: buildShippingAddress(data),
      notes: buildOrderNotes(data.paymentMethod, data.notes || null),
      items: data.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    });

    // Apply the admin-chosen initial status if it differs from the gateway
    // default (which is typically "pending").
    if (data.status && data.status !== order.status) {
      try {
        const updated = await apiClient.updateOrder(
          session.user.apiToken,
          order.id,
          { status: data.status }
        );
        return NextResponse.json({ order: updated }, { status: 201 });
      } catch {
        // Fall through and return the order with its default status if the
        // status update fails — the order itself was created successfully.
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la création de la commande");
  }
}
