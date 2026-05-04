import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adaptProduct, apiClient } from "@/lib/api-client";
import { formatPrice, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin");
  const token = session.user.apiToken;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [orders, products] = await Promise.all([
    apiClient.listOrders(token).catch((e) => { console.error("[admin] orders failed", e); return []; }),
    apiClient.listProducts(token).catch((e) => { console.error("[admin] products failed", e); return []; }),
  ]);

  const adapted = products.map(adaptProduct);
  const lowStock = adapted.filter((p) => p.isActive && p.stock <= 20).sort((a, b) => a.stock - b.stock).slice(0, 5);
  const recent = [...orders]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 8);
  const revenue30d = orders
    .filter((o) => o.status !== "cancelled" && o.created_at && new Date(o.created_at) >= since)
    .reduce((s, o) => s + Number(o.total ?? 0), 0);

  const stats = [
    { label: "Total Orders", value: orders.length },
    { label: "Revenue (30d)", value: formatPrice(revenue30d) },
    { label: "Active Products", value: adapted.filter((p) => p.isActive).length },
    { label: "Low-stock Products", value: lowStock.length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-kraft-600 uppercase">{s.label}</div>
            <div className="text-2xl font-bold text-kraft-900 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-kraft-700 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-kraft-600">No orders yet.</div>
          ) : (
            <ul className="divide-y divide-kraft-100 text-sm">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="py-2 flex justify-between hover:text-kraft-700">
                    <span className="font-mono">{o.id}</span>
                    <span>{formatPrice(Number(o.total))}</span>
                    <span className="badge bg-kraft-200 text-kraft-800">{statusLabel(o.status)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Low-stock Products</h2>
            <Link href="/admin/products" className="text-sm text-kraft-700 hover:underline">Manage</Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="text-sm text-kraft-600">All products have healthy stock.</div>
          ) : (
            <ul className="divide-y divide-kraft-100 text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <Link href={`/admin/products/${p.id}`} className="hover:text-kraft-700">{p.name}</Link>
                  <span className="text-red-600 font-semibold">{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
