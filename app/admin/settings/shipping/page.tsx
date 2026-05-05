import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { ShippingSettingsForm } from "@/components/admin/ShippingSettingsForm";

export const dynamic = "force-dynamic";

export default async function ShippingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/settings/shipping");
  const settings = await apiClient.getSiteSettings(session.user.apiToken);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Frais de livraison</h1>
      <p className="text-sm text-kraft-700 mb-4">
        Configurez les frais de livraison par paliers de quantité.
        Pour chaque palier, indiquez la quantité minimale d&apos;articles dans le panier
        et le frais correspondant. Le palier appliqué est celui dont la quantité minimale
        est la plus élevée tout en restant inférieure ou égale à la quantité du panier.
      </p>
      <p className="text-sm text-kraft-700 mb-4">
        Exemple&nbsp;: 1 article&nbsp;= 7 DT, 3 articles&nbsp;= 14 DT, 5 articles&nbsp;= 21 DT.
        Un panier de 4 articles paiera donc 14 DT, et un panier de 6 articles paiera 21 DT.
      </p>
      <ShippingSettingsForm initial={settings.shipping} />
    </div>
  );
}
