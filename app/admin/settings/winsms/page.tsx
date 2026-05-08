import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { WinSmsSettingsForm } from "@/components/admin/WinSmsSettingsForm";

export const dynamic = "force-dynamic";

export default async function WinSmsSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/settings/winsms");
  }
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">
        Confirmation par SMS (WinSMS)
      </h1>
      <p className="text-sm text-kraft-700 mb-4">
        Activez l&apos;auto-confirmation des commandes par code OTP envoyé par
        SMS. Lorsque cette fonctionnalité est active, le client voit deux
        boutons sur la page de remerciement : recevoir un code de confirmation
        par SMS, ou demander à être rappelé pour confirmer manuellement.
      </p>
      <WinSmsSettingsForm initial={settings.winsms} />
    </div>
  );
}
