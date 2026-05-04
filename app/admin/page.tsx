import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { collectErrors, safeQuery } from "@/lib/safe-query";
import { DbErrorBanner } from "@/components/admin/DbErrorBanner";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  // Run each query independently so a single failure (e.g. missing table on a
  // freshly-provisioned Postgres) cannot crash the whole page render.
  const [totalOrders, revenueAgg, lowStock, newCustomers, recentOrders] = await Promise.all([
    safeQuery("order.count", () => prisma.order.count(), 0),
    safeQuery(
      "order.revenue",
      () =>
        prisma.order.aggregate({
          _sum: { total: true },
          where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
        }),
      { _sum: { total: 0 } } as { _sum: { total: number | null } }
    ),
    safeQuery(
      "product.lowStock",
      () =>
        prisma.product.findMany({
          where: { stock: { lte: 20 }, isActive: true },
          orderBy: { stock: "asc" },
          take: 5,
        }),
      [] as Awaited<ReturnType<typeof prisma.product.findMany>>
    ),
    safeQuery(
      "user.newCustomers",
      () => prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
      0
    ),
    safeQuery(
      "order.recent",
      () => prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      [] as Awaited<ReturnType<typeof prisma.order.findMany>>
    ),
  ]);

  const dbError = collectErrors(totalOrders, revenueAgg, lowStock, newCustomers, recentOrders);

  const stats = [
    { label: "Total Orders", value: totalOrders.data },
    { label: "Revenue (30d)", value: formatPrice(revenueAgg.data._sum.total ?? 0) },
    { label: "New Customers (30d)", value: newCustomers.data },
    { label: "Low-stock Products", value: lowStock.data.length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-6">Dashboard</h1>
      {dbError && <DbErrorBanner error={dbError} />}
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
          {recentOrders.data.length === 0 ? (
            <div className="text-sm text-kraft-600">No orders yet.</div>
          ) : (
            <ul className="divide-y divide-kraft-100 text-sm">
              {recentOrders.data.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="py-2 flex justify-between hover:text-kraft-700">
                    <span className="font-mono">{o.reference}</span>
                    <span>{formatPrice(o.total)}</span>
                    <span className="badge bg-kraft-200 text-kraft-800">{o.status}</span>
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
          {lowStock.data.length === 0 ? (
            <div className="text-sm text-kraft-600">All products have healthy stock.</div>
          ) : (
            <ul className="divide-y divide-kraft-100 text-sm">
              {lowStock.data.map((p) => (
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
