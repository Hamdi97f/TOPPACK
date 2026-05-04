import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { CustomerActiveToggle } from "@/components/admin/CustomerActiveToggle";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" } } },
  });
  if (!user) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900">{user.name}</h1>
      <div className="text-sm text-kraft-700">{user.email}</div>
      <div className="card p-4 mt-4 grid sm:grid-cols-2 gap-2 text-sm">
        <div><strong>Phone:</strong> {user.phone || "—"}</div>
        <div><strong>Country:</strong> {user.country || "—"}</div>
        <div><strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <strong>Status:</strong>
          <CustomerActiveToggle id={user.id} isActive={user.isActive} />
        </div>
      </div>

      <h2 className="text-xl font-bold mt-6 mb-2">Orders ({user.orders.length})</h2>
      <div className="card divide-y divide-kraft-100">
        {user.orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="p-3 flex justify-between hover:bg-kraft-50">
            <span className="font-mono text-sm">{o.reference}</span>
            <span className="text-sm">{new Date(o.createdAt).toLocaleDateString()}</span>
            <span className="badge bg-kraft-200 text-kraft-800">{o.status}</span>
            <span className="font-semibold">{formatPrice(o.total)}</span>
          </Link>
        ))}
        {user.orders.length === 0 && <div className="p-6 text-center text-kraft-600 text-sm">No orders yet.</div>}
      </div>
    </div>
  );
}
