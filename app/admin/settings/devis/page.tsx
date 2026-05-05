import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { DevisSettingsForm } from "@/components/admin/DevisSettingsForm";

export const dynamic = "force-dynamic";

export default async function DevisSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/settings/devis");
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Paramètres du formulaire de devis</h1>
      <p className="text-sm text-kraft-700 mb-4">
        Choisissez les champs à afficher sur la page de demande de devis et lesquels sont obligatoires,
        puis fixez la quantité minimale qu&apos;un client peut demander.
      </p>
      <DevisSettingsForm initial={settings.devis} />
    </div>
  );
}
