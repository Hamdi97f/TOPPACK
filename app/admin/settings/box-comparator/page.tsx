import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { BoxComparatorSettingsForm } from "@/components/admin/BoxComparatorSettingsForm";

export const dynamic = "force-dynamic";

export default async function BoxComparatorSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/settings/box-comparator");
  }
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Comparateur 3D</h1>
      <p className="text-sm text-kraft-700 mb-4">
        Publiez ou masquez la page publique <code>/box-comparator</code> qui
        permet aux visiteurs de comparer en 3D la taille d&apos;un carton avec
        des objets standards (bouteille de 1,5 L, rame A4, etc.).
      </p>
      <BoxComparatorSettingsForm initial={settings.boxComparator} />
    </div>
  );
}
