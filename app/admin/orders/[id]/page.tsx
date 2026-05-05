import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  adaptProduct,
  apiClient,
  ApiError,
  parseOrderNotes,
  parseShippingAddress,
} from "@/lib/api-client";
import { formatPrice, paymentMethodLabel, statusLabel } from "@/lib/utils";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { PrintButton } from "@/components/admin/PrintButton";
import { OrderDeleteButton } from "@/components/admin/OrderDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/orders");
  const token = session.user.apiToken;
  const { id } = await params;

  let order;
  try {
    order = await apiClient.getOrder(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const products = await apiClient.listProducts(token).catch(() => []);
  const productById = new Map(products.map((p) => [p.id, adaptProduct(p)]));
  const { paymentMethod, text: noteText } = parseOrderNotes(order.notes);
  const shipping = parseShippingAddress(order.shipping_address);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-kraft-900">Commande {order.id}</h1>
          {order.created_at && <div className="text-sm text-kraft-600">{new Date(order.created_at).toLocaleString("fr-FR")}</div>}
        </div>
        <div className="flex gap-2 print:hidden items-center">
          <OrderStatusForm id={order.id} status={order.status} />
          <PrintButton />
          <OrderDeleteButton
            id={order.id}
            redirectTo="/admin/orders"
            className="btn-secondary !py-1 !px-3 text-xs text-red-600 border border-red-200 hover:bg-red-50"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="font-semibold mb-2">Client</h2>
          <div>{order.customer_name ?? "—"}</div>
          <div className="text-sm">{order.customer_email ?? "—"}</div>
          {shipping.customerPhone && <div className="text-sm">{shipping.customerPhone}</div>}
        </section>
        <section className="card p-4">
          <h2 className="font-semibold mb-2">Livraison</h2>
          <div>{shipping.addressLine || "—"}</div>
          {(shipping.city || shipping.postalCode) && <div>{shipping.city} {shipping.postalCode}</div>}
          {shipping.country && <div>{shipping.country}</div>}
        </section>
      </div>

      <section className="card p-4 mt-4">
        <h2 className="font-semibold mb-2">Articles</h2>
        <table className="w-full text-sm hidden md:table">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Produit</th>
              <th className="text-right p-2">Qté</th>
              <th className="text-right p-2">Unité</th>
              <th className="text-right p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((i, idx) => {
              const p = productById.get(i.product_id);
              const lineTotal = Number(i.unit_price) * i.quantity;
              return (
                <tr key={i.id ?? idx} className="border-t border-kraft-100">
                  <td className="p-2">{p?.name ?? i.product_id}</td>
                  <td className="p-2 text-right">{i.quantity}</td>
                  <td className="p-2 text-right">{formatPrice(Number(i.unit_price))}</td>
                  <td className="p-2 text-right">{formatPrice(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t border-kraft-200">
              <td colSpan={3} className="p-2 text-right">Total</td>
              <td className="p-2 text-right">{formatPrice(Number(order.total))}</td>
            </tr>
          </tfoot>
        </table>
        <ul className="md:hidden divide-y divide-kraft-100 -mx-4">
          {order.order_items.map((i, idx) => {
            const p = productById.get(i.product_id);
            const lineTotal = Number(i.unit_price) * i.quantity;
            return (
              <li key={i.id ?? idx} className="px-4 py-3">
                <div className="font-medium text-kraft-900">{p?.name ?? i.product_id}</div>
                <div className="mt-1 text-sm text-kraft-700 flex justify-between">
                  <span>{i.quantity} × {formatPrice(Number(i.unit_price))}</span>
                  <span className="font-semibold">{formatPrice(lineTotal)}</span>
                </div>
              </li>
            );
          })}
          <li className="px-4 py-3 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatPrice(Number(order.total))}</span>
          </li>
        </ul>
      </section>

      <section className="card p-4 mt-4 text-sm">
        <div><strong>Paiement :</strong> {paymentMethodLabel(paymentMethod)}</div>
        <div><strong>Statut :</strong> {statusLabel(order.status)}</div>
        {noteText && <div className="mt-2"><strong>Notes :</strong> {noteText}</div>}
      </section>
    </div>
  );
}
