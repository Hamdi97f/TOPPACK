import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice, ORDER_STATUSES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const orders = await prisma.order.findMany({
    where: status && (ORDER_STATUSES as readonly string[]).includes(status) ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Orders</h1>
      <form className="mb-4 flex items-center gap-2">
        <label htmlFor="status" className="text-sm">Status:</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="select max-w-xs">
          <option value="">All</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="btn-secondary !py-1 !px-3 text-sm">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Reference</th>
              <th className="text-left p-2">Customer</th>
              <th className="text-left p-2">Date</th>
              <th className="text-right p-2">Total</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-kraft-100">
                <td className="p-2"><Link href={`/admin/orders/${o.id}`} className="font-mono hover:text-kraft-700">{o.reference}</Link></td>
                <td className="p-2">{o.customerName}<div className="text-xs text-kraft-600">{o.customerEmail}</div></td>
                <td className="p-2">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="p-2 text-right">{formatPrice(o.total)}</td>
                <td className="p-2"><span className="badge bg-kraft-200 text-kraft-800">{o.status}</span></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-kraft-600">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
