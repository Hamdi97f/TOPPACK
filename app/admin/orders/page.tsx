import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { formatPrice, ORDER_STATUSES, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/orders");
  const token = session.user.apiToken;

  const { status } = await searchParams;
  const all = await apiClient.listOrders(token).catch((e) => { console.error("[admin/orders] failed", e); return []; });
  const orders = (status && (ORDER_STATUSES as readonly string[]).includes(status)
    ? all.filter((o) => o.status === status)
    : all)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 200);
  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Orders</h1>
      <form className="mb-4 flex items-center gap-2">
        <label htmlFor="status" className="text-sm">Status:</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="select max-w-xs">
          <option value="">All</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
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
                <td className="p-2"><Link href={`/admin/orders/${o.id}`} className="font-mono hover:text-kraft-700">{o.id}</Link></td>
                <td className="p-2">{o.customer_name ?? "—"}<div className="text-xs text-kraft-600">{o.customer_email ?? ""}</div></td>
                <td className="p-2">{o.created_at ? new Date(o.created_at).toLocaleString() : "—"}</td>
                <td className="p-2 text-right">{formatPrice(Number(o.total))}</td>
                <td className="p-2"><span className="badge bg-kraft-200 text-kraft-800">{statusLabel(o.status)}</span></td>
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
