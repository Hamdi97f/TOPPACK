import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { BoxComparatorClient } from "./BoxComparatorClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Comparateur 3D — TOPPACK",
  description:
    "Comparez en 3D la taille d'un carton TOPPACK avec des objets du quotidien : bouteille d'eau de 1,5 L, rame de papier A4, livre, smartphone, ordinateur portable, etc.",
};

export default async function BoxComparatorPage() {
  const [settings, session] = await Promise.all([
    apiClient.getSiteSettings(),
    getServerSession(authOptions),
  ]);
  const isAdmin = session?.user?.role === "ADMIN";

  if (!settings.boxComparator.enabled && !isAdmin) {
    notFound();
  }

  const adminPreview = !settings.boxComparator.enabled && isAdmin;

  return (
    <div className="container-x py-8 sm:py-12 max-w-6xl">
      {adminPreview && (
        <div className="mb-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Aperçu administrateur :</strong> cette page est actuellement
          masquée pour les visiteurs.{" "}
          <Link href="/admin/settings/box-comparator" className="underline">
            Modifier la visibilité
          </Link>
          .
        </div>
      )}

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-kraft-900">Comparateur 3D</h1>
        <p className="mt-2 text-kraft-700 max-w-2xl">
          Visualisez en 3D la taille d&apos;un carton TOPPACK et comparez-la
          avec des objets standards. Choisissez un carton (ou saisissez vos
          propres dimensions), puis l&apos;objet à comparer pour voir combien
          d&apos;exemplaires y tiennent.
        </p>
      </header>

      <BoxComparatorClient />
    </div>
  );
}
