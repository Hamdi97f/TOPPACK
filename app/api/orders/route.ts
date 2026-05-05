import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  apiClient,
  ApiError,
  buildOrderNotes,
  buildShippingAddress,
  getServiceToken,
} from "@/lib/api-client";
import { buildCheckoutSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Always re-read the admin's current configuration server-side. The client
  // never controls which fields are required or which payment methods are
  // accepted.
  const settings = await apiClient.getCheckoutSettings();
  const schema = buildCheckoutSchema(settings);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid order data" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Use the customer's own bearer token if logged in, otherwise the service
  // account so the api-gateway can compute pricing from the product catalog.
  // The webapp recomputes total server-side from product prices — client
  // prices are never trusted.
  const token = session?.user?.apiToken ?? (await getServiceToken());

  try {
    const order = await apiClient.createOrder(token, {
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      shipping_address: buildShippingAddress(data),
      notes: buildOrderNotes(data.paymentMethod, data.notes ?? null),
      items: data.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    });
    return NextResponse.json({ id: order.id, reference: order.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
