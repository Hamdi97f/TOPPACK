import type { Metadata } from "next";
import { DevisForm } from "@/components/DevisForm";
import { apiClient } from "@/lib/api-client";
import { defaultDevisFormSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Demande de devis — TOPPACK",
  description:
    "Demandez un devis personnalisé pour vos cartons en carton ondulé : modèle FEFCO, dimensions, cannelure, couleur, impression et quantité.",
};

export const dynamic = "force-dynamic";

export default async function DevisPage() {
  let devisSettings = defaultDevisFormSettings();
  try {
    const settings = await apiClient.getSiteSettings();
    devisSettings = settings.devis;
  } catch {
    // Fall back to defaults if the gateway is unreachable.
  }

  return (
    <div className="container-x py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-kraft-900">Demande de devis</h1>
      <p className="mt-3 text-kraft-800">
        Décrivez vos besoins en cartons ondulés sur mesure. Notre équipe vous
        répond sous un jour ouvré avec une proposition chiffrée.
      </p>
      <div className="mt-8">
        <DevisForm settings={devisSettings} />
      </div>
    </div>
  );
}
