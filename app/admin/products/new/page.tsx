import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adaptCategory, apiClient } from "@/lib/api-client";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/products/new");
  const categories = (await apiClient.listCategories(session.user.apiToken).catch(() => [])).map(adaptCategory);
  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Nouveau produit</h1>
      <ProductForm categories={categories} mode={{ kind: "create" }} />
    </div>
  );
}
