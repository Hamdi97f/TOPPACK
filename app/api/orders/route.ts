import { NextResponse } from "next/server";
import { headers } from "next/headers";
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
import { sendMetaPurchaseEvent } from "@/lib/meta-capi";
import { computeShippingFee } from "@/lib/site-settings";

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
  const settings = await apiClient.getSiteSettings();

  // Account-required gate: re-checked server-side so the client can't bypass.
  if (settings.account.requireAccountForOrder && !session) {
    return NextResponse.json(
      {
        error: "Vous devez vous connecter pour passer une commande.",
        code: "ACCOUNT_REQUIRED",
      },
      { status: 401 }
    );
  }

  const schema = buildCheckoutSchema(settings.checkout);

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

  // Compute shipping fee server-side from the cart's total quantity. Never
  // trust any value the client may have provided.
  const totalQuantity = data.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const shippingFee = computeShippingFee(totalQuantity, settings.shipping);

  let order;
  try {
    order = await apiClient.createOrder(token, {
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      shipping_address: buildShippingAddress(data),
      notes: buildOrderNotes(data.paymentMethod, data.notes ?? null, shippingFee),
      items: data.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // Best-effort server-side conversion event — never blocks the response.
  // Deduplicated client-side via the same `event_id`.
  if (settings.integrations.metaPixelId && settings.integrations.metaCapiToken) {
    const h = await headers();
    const fwd = h.get("x-forwarded-for") || "";
    const clientIp = fwd.split(",")[0]?.trim() || undefined;
    const ua = h.get("user-agent") || undefined;
    const cookieHeader = h.get("cookie") || "";
    const fbc = /(?:^|;\s*)_fbc=([^;]+)/.exec(cookieHeader)?.[1];
    const fbp = /(?:^|;\s*)_fbp=([^;]+)/.exec(cookieHeader)?.[1];
    const origin = h.get("origin") || h.get("referer") || "";
    void sendMetaPurchaseEvent({
      pixelId: settings.integrations.metaPixelId,
      accessToken: settings.integrations.metaCapiToken,
      testEventCode: settings.integrations.metaCapiTestEventCode || undefined,
      eventId: order.id,
      email: data.customerEmail || undefined,
      phone: data.customerPhone || undefined,
      value: (typeof order.total === "number" ? order.total : 0) + shippingFee,
      currency: "EUR",
      eventSourceUrl: origin ? `${origin.replace(/\/$/, "")}/checkout` : undefined,
      clientIpAddress: clientIp,
      clientUserAgent: ua,
      fbc,
      fbp,
    });
  }

  return NextResponse.json({ id: order.id, reference: order.id }, { status: 201 });
}
