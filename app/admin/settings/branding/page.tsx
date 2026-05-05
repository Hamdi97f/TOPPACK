import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { BrandingForm } from "@/components/admin/BrandingForm";

export const dynamic = "force-dynamic";

export default async function BrandingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/settings/branding");
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Identité du site</h1>
      <p className="text-sm text-kraft-700 mb-4">
        Personnalisez le titre, la description, l&apos;image de partage social
        et le favicon affichés dans le navigateur, sur Google et lorsque votre
        site est partagé sur les réseaux sociaux.
      </p>
      <BrandingForm initial={settings.branding} />
    </div>
  );
}
