import type { Metadata } from "next";
import { DevisForm } from "@/components/DevisForm";

export const metadata: Metadata = {
  title: "Demande de devis — TOPPACK",
  description:
    "Demandez un devis personnalisé pour vos cartons en carton ondulé : modèle FEFCO, dimensions, cannelure, couleur, impression et quantité.",
};

export default function DevisPage() {
  return (
    <div className="container-x py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-kraft-900">Demande de devis</h1>
      <p className="mt-3 text-kraft-800">
        Décrivez vos besoins en cartons ondulés sur mesure. Notre équipe vous
        répond sous un jour ouvré avec une proposition chiffrée.
      </p>
      <div className="mt-8">
        <DevisForm />
      </div>
    </div>
  );
}
