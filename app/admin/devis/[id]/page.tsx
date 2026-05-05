import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import {
  cartonColorLabel,
  devisStatusLabel,
  displayModel,
  ondulationLabel,
} from "@/lib/devis";
import { DevisDeleteButton } from "@/components/admin/DevisDeleteButton";
import { DevisStatusForm } from "@/components/admin/DevisStatusForm";
import { DevisNotesForm } from "@/components/admin/DevisNotesForm";

export const dynamic = "force-dynamic";

export default async function AdminDevisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/devis");
  }
  const { id } = await params;
  const record = await apiClient.getDevis(session.user.apiToken, id).catch((e) => {
    console.error("[admin/devis/:id] failed", e);
    return null;
  });
  if (!record) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href="/admin/devis" className="text-sm text-kraft-700 hover:underline">
            ← Toutes les demandes
          </Link>
          <h1 className="text-2xl font-bold text-kraft-900 mt-1">
            Devis {record.reference || record.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-kraft-700">
            Reçu le {new Date(record.createdAt).toLocaleString("fr-FR")} —{" "}
            <span className="badge bg-kraft-200 text-kraft-800">
              {devisStatusLabel(record.status)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DevisStatusForm id={record.id} status={record.status} />
          <DevisDeleteButton
            id={record.id}
            redirectTo="/admin/devis"
            className="btn-danger !py-1 !px-3 text-xs"
            label="Supprimer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="font-semibold text-kraft-900 mb-3">Client</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Nom" value={record.customerName} />
            {record.company && <Row label="Société" value={record.company} />}
            <Row
              label="E-mail"
              value={
                <a href={`mailto:${record.customerEmail}`} className="text-kraft-800 underline">
                  {record.customerEmail}
                </a>
              }
            />
            <Row
              label="Téléphone"
              value={
                <a href={`tel:${record.customerPhone.replace(/\s+/g, "")}`} className="text-kraft-800 underline">
                  {record.customerPhone}
                </a>
              }
            />
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-kraft-900 mb-3">Caractéristiques</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Modèle" value={displayModel(record)} />
            <Row
              label="Dimensions"
              value={`${record.lengthCm} × ${record.widthCm} × ${record.heightCm} cm`}
            />
            <Row label="Ondulation" value={ondulationLabel(record.ondulation)} />
            <Row label="Cannelure" value={record.cannelure} />
            <Row label="Couleur" value={cartonColorLabel(record.color)} />
            <Row label="Quantité" value={record.quantity.toLocaleString("fr-FR")} />
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-kraft-900 mb-3">Impression</h2>
          {record.printing ? (
            <div className="space-y-3">
              <p className="text-sm text-kraft-800">Impression demandée.</p>
              {record.logoUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={record.logoUrl}
                    alt={record.logoFileName || "Logo"}
                    className="h-20 w-20 object-contain border border-kraft-200 rounded bg-white"
                  />
                  <div>
                    <div className="text-sm text-kraft-800 break-all">
                      {record.logoFileName || "Logo"}
                    </div>
                    <a
                      href={record.logoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={record.logoFileName || true}
                      className="text-sm text-kraft-700 underline"
                    >
                      Télécharger
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-kraft-600">Aucun logo téléversé.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-kraft-600">Pas d&apos;impression demandée.</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-kraft-900 mb-3">Message du client</h2>
          {record.message ? (
            <p className="text-sm text-kraft-800 whitespace-pre-line">{record.message}</p>
          ) : (
            <p className="text-sm text-kraft-600">Aucun message.</p>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold text-kraft-900 mb-3">Notes internes</h2>
        <DevisNotesForm id={record.id} initialNotes={record.internalNotes} />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-28 shrink-0 text-kraft-600">{label}</dt>
      <dd className="text-kraft-900 break-words">{value}</dd>
    </div>
  );
}
