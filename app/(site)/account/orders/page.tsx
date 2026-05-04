import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { formatPrice, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/account/orders");

  const orders = await apiClient.listOrders(session.user.apiToken).catch(() => []);

  return (
    <div className="container-x py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">My Orders</h1>
      {orders.length === 0 ? (
        <div className="card p-6 text-center text-kraft-600">No orders yet.</div>
      ) : (
        <div className="card divide-y divide-kraft-100">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}/confirmation`} className="p-4 flex items-center justify-between hover:bg-kraft-50">
              <div>
                <div className="font-mono text-sm">{o.id}</div>
                {o.created_at && <div className="text-xs text-kraft-600">{new Date(o.created_at).toLocaleString()}</div>}
              </div>
              <div className="text-sm">
                <span className="badge bg-kraft-200 text-kraft-800 mr-2">{statusLabel(o.status)}</span>
                <span className="font-semibold">{formatPrice(Number(o.total))}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
