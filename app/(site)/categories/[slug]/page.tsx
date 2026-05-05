import { notFound } from "next/navigation";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [allCategories, allProducts] = await Promise.all([
    apiClient.listCategories(),
    apiClient.listProducts(),
  ]);
  const categories = allCategories.map(adaptCategory);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  const products = allProducts
    .map(adaptProduct)
    .filter((p) => p.isActive && p.categoryId === category.id);

  return (
    <div className="container-x py-8">
      <h1 className="text-2xl font-bold text-kraft-900">{category.name}</h1>
      {category.description && <p className="text-kraft-700 mt-1">{category.description}</p>}
      <div className="mt-6">
        {products.length === 0 ? (
          <div className="card p-8 text-center text-kraft-600">Aucun produit pour le moment.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
