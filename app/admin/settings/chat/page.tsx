import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { ChatSettingsForm } from "@/components/admin/ChatSettingsForm";

export const dynamic = "force-dynamic";

export default async function ChatSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/settings/chat");
  }
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Chat en direct</h1>
      <p className="text-sm text-kraft-700 mb-4">
        Activez une petite fenêtre de discussion sur le site pour échanger
        avec vos clients. Vous pouvez également activer le mode bot pour que
        des réponses prédéfinies soient envoyées automatiquement aux
        questions les plus fréquentes.
      </p>
      <ChatSettingsForm initial={settings.chat} />
    </div>
  );
}
