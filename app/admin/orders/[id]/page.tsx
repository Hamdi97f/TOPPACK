import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, paymentMethodLabel } from "@/lib/utils";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, user: true },
  });
  if (!order) notFound();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-kraft-900">Order {order.reference}</h1>
          <div className="text-sm text-kraft-600">{new Date(order.createdAt).toLocaleString()}</div>
        </div>
        <div className="flex gap-2">
          <OrderStatusForm id={order.id} status={order.status} />
          <PrintButton />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-4">
          <h2 className="font-semibold mb-2">Customer</h2>
          <div>{order.customerName}</div>
          <div className="text-sm">{order.customerEmail}</div>
          <div className="text-sm">{order.customerPhone}</div>
          {order.user && <div className="text-xs text-kraft-600 mt-1">Account: {order.user.email}</div>}
        </section>
        <section className="card p-4">
          <h2 className="font-semibold mb-2">Shipping</h2>
          <div>{order.addressLine}</div>
          <div>{order.city}, {order.postalCode}</div>
          <div>{order.country}</div>
        </section>
      </div>

      <section className="card p-4 mt-4">
        <h2 className="font-semibold mb-2">Items</h2>
        <table className="w-full text-sm">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">Qty</th>
              <th className="text-right p-2">Unit</th>
              <th className="text-right p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-t border-kraft-100">
                <td className="p-2">{i.name}</td>
                <td className="p-2 text-right">{i.quantity}</td>
                <td className="p-2 text-right">{formatPrice(i.unitPrice)}</td>
                <td className="p-2 text-right">{formatPrice(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t border-kraft-200">
              <td colSpan={3} className="p-2 text-right">Total</td>
              <td className="p-2 text-right">{formatPrice(order.total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="card p-4 mt-4 text-sm">
        <div><strong>Payment:</strong> {paymentMethodLabel(order.paymentMethod)}</div>
        <div><strong>Status:</strong> {order.status}</div>
        {order.notes && <div className="mt-2"><strong>Notes:</strong> {order.notes}</div>}
      </section>
    </div>
  );
}
