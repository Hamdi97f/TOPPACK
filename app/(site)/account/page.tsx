import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/account");

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="container-x py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900">My Account</h1>
      <div className="card p-6 mt-4">
        <div className="font-semibold">{user?.name}</div>
        <div className="text-sm text-kraft-700">{user?.email}</div>
        <div className="text-xs text-kraft-600 mt-1">Role: {user?.role}</div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-kraft-900">Recent Orders</h2>
          <Link href="/account/orders" className="text-sm text-kraft-700 hover:underline">View all</Link>
        </div>
        {orders.length === 0 ? (
          <div className="card p-6 text-center text-kraft-600">No orders yet.</div>
        ) : (
          <div className="card divide-y divide-kraft-100">
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}/confirmation`} className="p-4 flex items-center justify-between hover:bg-kraft-50">
                <div>
                  <div className="font-mono text-sm">{o.reference}</div>
                  <div className="text-xs text-kraft-600">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-sm">
                  <span className="badge bg-kraft-200 text-kraft-800 mr-2">{o.status}</span>
                  <span className="font-semibold">{formatPrice(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
