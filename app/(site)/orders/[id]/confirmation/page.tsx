import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  adaptProduct,
  apiClient,
  ApiError,
  parseOrderNotes,
} from "@/lib/api-client";
import { formatPrice, paymentMethodLabel, statusLabel } from "@/lib/utils";
import { OrderConfirmActions } from "@/components/OrderConfirmActions";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?callbackUrl=/orders/${id}/confirmation`);

  let order;
  try {
    order = await apiClient.getOrder(session.user.apiToken, id);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }
  if (!order) notFound();

  // Look up product names for the line items.
  const products = await apiClient.listProducts(session.user.apiToken).catch(() => []);
  const productById = new Map(products.map((p) => [p.id, adaptProduct(p)]));
  const { paymentMethod, shippingFee } = parseOrderNotes(order.notes);
  const itemsTotal = Number(order.total);
  const grandTotal = itemsTotal + (shippingFee ?? 0);

  // Only fetch site settings to decide whether to render the OTP/call buttons
  // — never expose admin-only fields (api key, sender id) to the client.
  const settings = await apiClient.getSiteSettings();
  const showConfirmActions =
    settings.winsms.enabled && (order.status || "").toLowerCase() === "pending";

  return (
    <div className="container-x py-10 max-w-2xl mx-auto">
      <div className="card p-8 text-center">
        <div className="text-5xl mb-2">✅</div>
        <h1 className="text-2xl font-bold text-kraft-900">Merci pour votre commande !</h1>
        <p className="text-kraft-700 mt-2">
          Votre référence de commande est <span className="font-mono font-semibold">{order.id}</span>.
        </p>
        {order.customer_email && (
          <p className="text-sm text-kraft-600 mt-1">
            Une confirmation a été envoyée à <strong>{order.customer_email}</strong>.
          </p>
        )}
      </div>
      <div className="card p-6 mt-6">
        <h2 className="font-bold mb-3">Détails de la commande</h2>
        <ul className="space-y-2 text-sm">
          {order.order_items.map((i, idx) => {
            const p = productById.get(i.product_id);
            const lineTotal = Number(i.unit_price) * i.quantity;
            return (
              <li key={i.id ?? idx} className="flex justify-between">
                <span>{p?.name ?? i.product_id} × {i.quantity}</span>
                <span>{formatPrice(lineTotal)}</span>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-kraft-200 mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{formatPrice(itemsTotal)}</span>
          </div>
          {shippingFee !== null && (
            <div className="flex justify-between text-kraft-700">
              <span>Livraison</span>
              <span>{formatPrice(shippingFee)}</span>
            </div>
          )}
        </div>
        <div className="border-t border-kraft-200 mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatPrice(grandTotal)}</span>
        </div>
        <div className="text-sm text-kraft-600 mt-3">Paiement : {paymentMethodLabel(paymentMethod)}</div>
        <div className="text-sm text-kraft-600">Statut : {statusLabel(order.status)}</div>
      </div>
      {showConfirmActions && <OrderConfirmActions orderId={order.id} />}
      <div className="text-center mt-6">
        <Link href="/products" className="btn-primary">Continuer mes achats</Link>
      </div>
    </div>
  );
}
