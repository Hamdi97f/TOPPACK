import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { IntegrationsForm } from "@/components/admin/IntegrationsForm";

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/settings/integrations");
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Intégrations</h1>
      <p className="text-sm text-kraft-700 mb-4">
        Configurez les services externes utilisés par la boutique.
      </p>
      <IntegrationsForm initial={settings.integrations} />
    </div>
  );
}
