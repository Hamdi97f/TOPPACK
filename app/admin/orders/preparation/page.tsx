import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  adaptProduct,
  apiClient,
  parseOrderNotes,
  parseShippingAddress,
} from "@/lib/api-client";
import { ORDER_STATUSES, paymentMethodLabel, statusLabel } from "@/lib/utils";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPreparationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/orders/preparation");
  }
  const token = session.user.apiToken;

  const { status: statusParam } = await searchParams;
  // Default to "confirmed" — this sheet is meant for warehouse preparation.
  let status: string;
  if (statusParam === "all") {
    status = "all";
  } else if (statusParam && (ORDER_STATUSES as readonly string[]).includes(statusParam)) {
    status = statusParam;
  } else {
    status = "confirmed";
  }

  const [allOrders, products] = await Promise.all([
    apiClient.listOrders(token).catch((e) => {
      console.error("[admin/orders/preparation] failed", e);
      return [];
    }),
    apiClient.listProducts(token).catch(() => []),
  ]);
  const productById = new Map(products.map((p) => [p.id, adaptProduct(p)]));

  const orders = (status !== "all" ? allOrders.filter((o) => o.status === status) : allOrders)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));

  const totalItems = orders.reduce(
    (sum, o) => sum + o.order_items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const printedAt = new Date().toLocaleString("fr-FR");

  return (
    <div className="max-w-5xl print:max-w-none">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-kraft-900">
            Bon de préparation des commandes
          </h1>
          <p className="text-sm text-kraft-600">
            Document interne — à remettre au préparateur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders${status !== "all" ? `?status=${encodeURIComponent(status)}` : ""}`}
            className="btn-secondary !py-1 !px-3 text-sm"
          >
            Retour
          </Link>
          <PrintButton />
        </div>
      </div>

      <form className="mb-4 flex items-center gap-2 print:hidden">
        <label htmlFor="status" className="text-sm">Statut :</label>
        <select id="status" name="status" defaultValue={status} className="select max-w-xs">
          <option value="all">Tous</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary !py-1 !px-3 text-sm">Filtrer</button>
      </form>

      <header className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Bon de préparation des commandes</h1>
        <p className="text-xs">Document interne — à remettre au préparateur</p>
        <p className="text-xs">
          Statut : {status === "all" ? "Tous" : statusLabel(status)} — {orders.length}{" "}
          commande{orders.length > 1 ? "s" : ""} — {totalItems} article
          {totalItems > 1 ? "s" : ""} — Imprimé le {printedAt}
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="card p-6 text-center text-kraft-600">
          Aucune commande à préparer.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto print:border print:border-kraft-300 print:rounded-none print:shadow-none print:overflow-visible">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-kraft-100 text-kraft-800 print:bg-transparent print:border-b print:border-kraft-400">
              <tr>
                <th className="text-left p-2 print:p-1 w-10">#</th>
                <th className="text-left p-2 print:p-1">Commande</th>
                <th className="text-left p-2 print:p-1">Client</th>
                <th className="text-left p-2 print:p-1">Livraison</th>
                <th className="text-left p-2 print:p-1">Articles à préparer</th>
                <th className="text-left p-2 print:p-1 w-28">Paiement / Notes</th>
                <th className="p-2 print:p-1 w-12 text-center">✓</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => {
                const ship = parseShippingAddress(o.shipping_address);
                const { paymentMethod, text: noteText } = parseOrderNotes(o.notes);
                const itemQty = o.order_items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr
                    key={o.id}
                    className="border-t border-kraft-200 align-top print:break-inside-avoid"
                  >
                    <td className="p-2 print:p-1 font-semibold">{idx + 1}</td>
                    <td className="p-2 print:p-1">
                      <div className="font-mono text-xs break-all">{o.id}</div>
                      {o.created_at && (
                        <div className="text-xs text-kraft-600">
                          {new Date(o.created_at).toLocaleString("fr-FR")}
                        </div>
                      )}
                      <div className="text-xs mt-1">
                        <span className="text-kraft-600">Statut :</span>{" "}
                        <span className="font-semibold">{statusLabel(o.status)}</span>
                      </div>
                      <div className="text-xs text-kraft-600">
                        {itemQty} article{itemQty > 1 ? "s" : ""}
                      </div>
                    </td>
                    <td className="p-2 print:p-1">
                      <div className="font-semibold">{o.customer_name ?? "—"}</div>
                      {ship.customerPhone && (
                        <div className="text-xs">Tél : {ship.customerPhone}</div>
                      )}
                      {o.customer_email && (
                        <div className="text-xs break-all">{o.customer_email}</div>
                      )}
                    </td>
                    <td className="p-2 print:p-1 text-xs">
                      <div>{ship.addressLine || "—"}</div>
                      {(ship.city || ship.postalCode) && (
                        <div>
                          {ship.city} {ship.postalCode}
                        </div>
                      )}
                      {ship.country && <div>{ship.country}</div>}
                    </td>
                    <td className="p-2 print:p-1">
                      <ul className="space-y-1">
                        {o.order_items.map((i, j) => {
                          const p = productById.get(i.product_id);
                          return (
                            <li
                              key={i.id ?? `${o.id}-${j}`}
                              className="flex items-baseline gap-2"
                            >
                              <span className="font-bold">{i.quantity}×</span>
                              <span>{p?.name ?? i.product_id}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="p-2 print:p-1 text-xs">
                      {paymentMethod && (
                        <div>{paymentMethodLabel(paymentMethod)}</div>
                      )}
                      {noteText && (
                        <div className="text-kraft-600">{noteText}</div>
                      )}
                      {!paymentMethod && !noteText && <span>—</span>}
                    </td>
                    <td className="p-2 print:p-1 text-center">
                      <span className="inline-block w-5 h-5 border border-kraft-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
