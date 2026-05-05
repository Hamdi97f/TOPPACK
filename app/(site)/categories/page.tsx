import Link from "next/link";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";

export const revalidate = 60;

export default async function CategoriesPage() {
  let categories: ReturnType<typeof adaptCategory>[] = [];
  let counts = new Map<string, number>();
  let apiError = false;
  try {
    const [c, p] = await Promise.all([apiClient.listCategories(), apiClient.listProducts()]);
    categories = c.map(adaptCategory);
    for (const product of p.map(adaptProduct)) {
      if (!product.categoryId) continue;
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }
  } catch (err) {
    console.error("[categories] failed to load data from api-gateway:", err);
    apiError = true;
  }
  return (
    <div className="container-x py-8">
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Catégories</h1>
      {apiError && (
        <div className="card p-4 mb-4 border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          Notre catalogue est temporairement indisponible. Veuillez réessayer sous peu.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((c) => (
          <Link key={c.id} href={`/categories/${c.slug}`} className="card p-6 hover:shadow-md transition">
            <div className="font-semibold text-kraft-800 text-lg">{c.name}</div>
            <p className="text-sm text-kraft-700 mt-1">{c.description}</p>
            <div className="text-xs text-kraft-600 mt-2">{counts.get(c.id) ?? 0} produits</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
