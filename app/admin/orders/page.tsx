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
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Commandes</h1>
      <form className="mb-4 flex items-center gap-2">
        <label htmlFor="status" className="text-sm">Statut :</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="select max-w-xs">
          <option value="">Tous</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <button type="submit" className="btn-secondary !py-1 !px-3 text-sm">Filtrer</button>
      </form>
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Référence</th>
              <th className="text-left p-2">Client</th>
              <th className="text-left p-2">Date</th>
              <th className="text-right p-2">Total</th>
              <th className="text-left p-2">Statut</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-kraft-100">
                <td className="p-2"><Link href={`/admin/orders/${o.id}`} className="font-mono hover:text-kraft-700">{o.id}</Link></td>
                <td className="p-2">{o.customer_name ?? "—"}<div className="text-xs text-kraft-600">{o.customer_email ?? ""}</div></td>
                <td className="p-2">{o.created_at ? new Date(o.created_at).toLocaleString("fr-FR") : "—"}</td>
                <td className="p-2 text-right">{formatPrice(Number(o.total))}</td>
                <td className="p-2"><span className="badge bg-kraft-200 text-kraft-800">{statusLabel(o.status)}</span></td>
                <td className="p-2 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="btn-secondary !py-1 !px-3 text-xs">Détails</Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-kraft-600">Aucune commande trouvée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="card p-4">
            <Link href={`/admin/orders/${o.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <div className="font-mono text-xs text-kraft-700 break-all">{o.id}</div>
                <span className="badge bg-kraft-200 text-kraft-800 shrink-0">{statusLabel(o.status)}</span>
              </div>
              <div className="mt-2 font-medium text-kraft-900">{o.customer_name ?? "—"}</div>
              {o.customer_email && <div className="text-xs text-kraft-600">{o.customer_email}</div>}
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-kraft-600">{o.created_at ? new Date(o.created_at).toLocaleString("fr-FR") : "—"}</span>
                <span className="font-bold text-kraft-800">{formatPrice(Number(o.total))}</span>
              </div>
              <div className="mt-3 text-right">
                <span className="btn-secondary !py-1 !px-3 text-xs inline-block">Détails</span>
              </div>
            </Link>
          </li>
        ))}
        {orders.length === 0 && (
          <li className="card p-6 text-center text-kraft-600">Aucune commande trouvée.</li>
        )}
      </ul>
    </div>
  );
}
