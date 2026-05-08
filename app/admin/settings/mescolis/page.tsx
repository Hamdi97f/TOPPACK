import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { MesColisSettingsForm } from "@/components/admin/MesColisSettingsForm";

export const dynamic = "force-dynamic";

export default async function MesColisSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/settings/mescolis");
  }
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">
        Compagnie de livraison (Mes Colis Express)
      </h1>
      <p className="text-sm text-kraft-700 mb-4">
        Configurez le jeton d&apos;accès Mes Colis Express puis utilisez le
        bouton «&nbsp;Synchroniser avec Mes Colis Express&nbsp;» depuis la
        page des commandes pour transmettre toutes les commandes confirmées
        à la compagnie de livraison en une seule action.
      </p>
      <MesColisSettingsForm initial={settings.mescolis} />
    </div>
  );
}
