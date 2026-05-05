import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { LIVE_EDIT_REGIONS } from "@/lib/live-edit/registry";
import { LiveEditClient } from "@/components/admin/LiveEditClient";

export const dynamic = "force-dynamic";

export default async function LiveEditPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/live-edit");
  }
  const settings = await apiClient.getSiteSettings(session.user.apiToken);
  return (
    <div className="-m-4 sm:-m-6 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-0px)]">
      <LiveEditClient regions={LIVE_EDIT_REGIONS} initial={settings.liveEdits} />
    </div>
  );
}
