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
        <ol className="space-y-4 print:space-y-0">
          {orders.map((o, idx) => {
            const ship = parseShippingAddress(o.shipping_address);
            const { paymentMethod, text: noteText } = parseOrderNotes(o.notes);
            const itemQty = o.order_items.reduce((s, i) => s + i.quantity, 0);
            return (
              <li
                key={o.id}
                className={
                  "card p-4 print:border print:border-kraft-300 print:p-3 print:rounded-none print:shadow-none print:break-inside-avoid" +
                  (idx > 0 ? " print:break-before-page" : "")
                }
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-kraft-600">
                      Commande #{idx + 1}
                    </div>
                    <div className="font-mono text-sm break-all">{o.id}</div>
                    {o.created_at && (
                      <div className="text-xs text-kraft-600">
                        {new Date(o.created_at).toLocaleString("fr-FR")}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-kraft-600">
                      Statut
                    </div>
                    <div className="font-semibold">{statusLabel(o.status)}</div>
                    <div className="text-xs text-kraft-600">
                      {itemQty} article{itemQty > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-kraft-600">
                      Client
                    </div>
                    <div className="font-semibold">{o.customer_name ?? "—"}</div>
                    {ship.customerPhone && (
                      <div className="text-sm">Tél : {ship.customerPhone}</div>
                    )}
                    {o.customer_email && (
                      <div className="text-sm">{o.customer_email}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-kraft-600">
                      Livraison
                    </div>
                    <div className="text-sm">{ship.addressLine || "—"}</div>
                    {(ship.city || ship.postalCode) && (
                      <div className="text-sm">
                        {ship.city} {ship.postalCode}
                      </div>
                    )}
                    {ship.country && <div className="text-sm">{ship.country}</div>}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs uppercase tracking-wide text-kraft-600 mb-1">
                    Articles à préparer
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-kraft-100 text-kraft-800 print:bg-transparent print:border-b print:border-kraft-400">
                      <tr>
                        <th className="text-left p-2 print:p-1 w-20">Qté</th>
                        <th className="text-left p-2 print:p-1">Produit</th>
                        <th className="text-left p-2 print:p-1 hidden md:table-cell print:table-cell">
                          Référence
                        </th>
                        <th className="p-2 print:p-1 w-16 text-center">✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.order_items.map((i, j) => {
                        const p = productById.get(i.product_id);
                        return (
                          <tr
                            key={i.id ?? `${o.id}-${j}`}
                            className="border-t border-kraft-100 print:border-kraft-300"
                          >
                            <td className="p-2 print:p-1 font-bold text-base">
                              {i.quantity}
                            </td>
                            <td className="p-2 print:p-1">
                              {p?.name ?? i.product_id}
                            </td>
                            <td className="p-2 print:p-1 font-mono text-xs hidden md:table-cell print:table-cell break-all">
                              {p?.id ?? i.product_id}
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

                {(noteText || paymentMethod) && (
                  <div className="mt-3 text-sm">
                    {paymentMethod && (
                      <div>
                        <span className="text-kraft-600">Paiement :</span>{" "}
                        {paymentMethodLabel(paymentMethod)}
                      </div>
                    )}
                    {noteText && (
                      <div>
                        <span className="text-kraft-600">Notes :</span> {noteText}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
