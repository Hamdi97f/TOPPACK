import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import {
  DEVIS_STATUSES,
  devisStatusLabel,
  displayModel,
  type DevisStatus,
} from "@/lib/devis";
import { DevisDeleteButton } from "@/components/admin/DevisDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminDevisPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/devis");
  }
  const token = session.user.apiToken;

  const { status } = await searchParams;
  const all = await apiClient.listDevis(token).catch((e) => {
    console.error("[admin/devis] failed", e);
    return [];
  });
  const records =
    status && (DEVIS_STATUSES as readonly string[]).includes(status)
      ? all.filter((r) => r.status === (status as DevisStatus))
      : all;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-2xl font-bold text-kraft-900">Demandes de devis</h1>
      </div>
      <form className="mb-4 flex items-center gap-2">
        <label htmlFor="status" className="text-sm">Statut :</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="select max-w-xs">
          <option value="">Tous</option>
          {DEVIS_STATUSES.map((s) => (
            <option key={s} value={s}>{devisStatusLabel(s)}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary !py-1 !px-3 text-sm">Filtrer</button>
      </form>

      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Référence</th>
              <th className="text-left p-2">Client</th>
              <th className="text-left p-2">Modèle</th>
              <th className="text-right p-2">Quantité</th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Statut</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-kraft-100">
                <td className="p-2">
                  <Link href={`/admin/devis/${r.id}`} className="font-mono hover:text-kraft-700">
                    {r.reference || r.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="p-2">
                  {r.customerName}
                  <div className="text-xs text-kraft-600">{r.customerEmail}</div>
                </td>
                <td className="p-2">{displayModel(r)}</td>
                <td className="p-2 text-right">{r.quantity.toLocaleString("fr-FR")}</td>
                <td className="p-2">{new Date(r.createdAt).toLocaleString("fr-FR")}</td>
                <td className="p-2">
                  <span className="badge bg-kraft-200 text-kraft-800">
                    {devisStatusLabel(r.status)}
                  </span>
                </td>
                <td className="p-2 text-right">
                  <div className="inline-flex items-center gap-3">
                    <Link href={`/admin/devis/${r.id}`} className="btn-secondary !py-1 !px-3 text-xs">
                      Détails
                    </Link>
                    <DevisDeleteButton id={r.id} />
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-kraft-600">
                  Aucune demande de devis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-3">
        {records.map((r) => (
          <li key={r.id} className="card p-4">
            <Link href={`/admin/devis/${r.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <div className="font-mono text-xs text-kraft-700 break-all">
                  {r.reference || r.id.slice(0, 8)}
                </div>
                <span className="badge bg-kraft-200 text-kraft-800 shrink-0">
                  {devisStatusLabel(r.status)}
                </span>
              </div>
              <div className="mt-2 font-medium text-kraft-900">{r.customerName}</div>
              <div className="text-xs text-kraft-600">{r.customerEmail}</div>
              <div className="mt-2 text-sm text-kraft-800">
                {displayModel(r)} — {r.quantity.toLocaleString("fr-FR")} ex.
              </div>
              <div className="mt-1 text-xs text-kraft-600">
                {new Date(r.createdAt).toLocaleString("fr-FR")}
              </div>
            </Link>
            <div className="mt-3 flex items-center justify-between">
              <DevisDeleteButton id={r.id} />
              <Link href={`/admin/devis/${r.id}`} className="btn-secondary !py-1 !px-3 text-xs">
                Détails
              </Link>
            </div>
          </li>
        ))}
        {records.length === 0 && (
          <li className="card p-6 text-center text-kraft-600">Aucune demande de devis.</li>
        )}
      </ul>
    </div>
  );
}
