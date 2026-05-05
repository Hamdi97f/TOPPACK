import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { ContactInfoForm } from "@/components/admin/ContactInfoForm";

export const dynamic = "force-dynamic";

export default async function ContactSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/settings/contact");
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Informations de contact</h1>
      <p className="text-sm text-kraft-700 mb-4">
        Ces informations apparaissent sur la page Contact, dans le pied de page et
        dans les en-têtes de commande.
      </p>
      <ContactInfoForm initial={settings.contact} />
    </div>
  );
}
