import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adaptProduct, apiClient } from "@/lib/api-client";
import {
  ManualOrderForm,
  type ManualOrderProduct,
} from "@/components/admin/ManualOrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    redirect("/login?callbackUrl=/admin/orders/new");

  const raw = await apiClient.listProducts(session.user.apiToken).catch(() => []);
  const products: ManualOrderProduct[] = raw
    .map(adaptProduct)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock: p.stock,
      isActive: p.isActive,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link href="/admin/orders" className="text-sm text-kraft-700 hover:underline">
          ← Retour aux commandes
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Nouvelle commande</h1>
      <p className="text-sm text-kraft-700 mb-4">
        Créez manuellement une commande pour le compte d&apos;un client (par
        exemple commande téléphonique). Le total est recalculé côté serveur
        d&apos;après le catalogue.
      </p>
      <ManualOrderForm products={products} />
    </div>
  );
}
