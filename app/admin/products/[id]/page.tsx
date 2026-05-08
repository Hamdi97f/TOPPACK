import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adaptCategory, adaptProduct, apiClient, ApiError } from "@/lib/api-client";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductReviewsManager } from "@/components/admin/ProductReviewsManager";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/products");
  const token = session.user.apiToken;
  const { id } = await params;

  let raw;
  try {
    raw = await apiClient.getProduct(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const product = adaptProduct(raw);
  const [categoriesRaw, reviews] = await Promise.all([
    apiClient.listCategories(token).catch(() => []),
    apiClient.listProductReviews(token, product.id).catch(() => []),
  ]);
  const categories = categoriesRaw.map(adaptCategory);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-kraft-900 mb-4">Modifier le produit</h1>
        <ProductForm categories={categories} mode={{ kind: "edit", product }} />
      </div>
      <ProductReviewsManager productId={product.id} initialReviews={reviews} />
    </div>
  );
}
