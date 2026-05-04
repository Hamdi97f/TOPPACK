import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { formatPrice, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/account");

  const token = session.user.apiToken;
  const [user, orders] = await Promise.all([
    apiClient.getUser(token).catch(() => null),
    apiClient.listOrders(token).catch(() => []),
  ]);
  const recent = orders.slice(0, 10);

  return (
    <div className="container-x py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900">Mon compte</h1>
      <div className="card p-6 mt-4">
        <div className="font-semibold">{user?.email ?? session.user.email}</div>
        <div className="text-xs text-kraft-600 mt-1">Rôle : {session.user.role === "ADMIN" ? "Administrateur" : "Client"}</div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-kraft-900">Commandes récentes</h2>
          <Link href="/account/orders" className="text-sm text-kraft-700 hover:underline">Voir toutes</Link>
        </div>
        {recent.length === 0 ? (
          <div className="card p-6 text-center text-kraft-600">Aucune commande pour le moment.</div>
        ) : (
          <div className="card divide-y divide-kraft-100">
            {recent.map((o) => (
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
    </div>
  );
}
