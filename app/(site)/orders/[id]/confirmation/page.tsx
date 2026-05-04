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
  const { paymentMethod } = parseOrderNotes(order.notes);

  return (
    <div className="container-x py-10 max-w-2xl mx-auto">
      <div className="card p-8 text-center">
        <div className="text-5xl mb-2">✅</div>
        <h1 className="text-2xl font-bold text-kraft-900">Thank you for your order!</h1>
        <p className="text-kraft-700 mt-2">
          Your order reference is <span className="font-mono font-semibold">{order.id}</span>.
        </p>
        {order.customer_email && (
          <p className="text-sm text-kraft-600 mt-1">
            A confirmation has been sent to <strong>{order.customer_email}</strong>.
          </p>
        )}
      </div>
      <div className="card p-6 mt-6">
        <h2 className="font-bold mb-3">Order Details</h2>
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
        <div className="border-t border-kraft-200 mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatPrice(Number(order.total))}</span>
        </div>
        <div className="text-sm text-kraft-600 mt-3">Payment: {paymentMethodLabel(paymentMethod)}</div>
        <div className="text-sm text-kraft-600">Status: {statusLabel(order.status)}</div>
      </div>
      <div className="text-center mt-6">
        <Link href="/products" className="btn-primary">Continue Shopping</Link>
      </div>
    </div>
  );
}
