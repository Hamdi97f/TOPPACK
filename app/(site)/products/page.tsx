import Link from "next/link";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; category?: string; wall?: string; min?: string; max?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q, category, wall, min, max } = await searchParams;

  let allProducts: ReturnType<typeof adaptProduct>[] = [];
  let categories: ReturnType<typeof adaptCategory>[] = [];
  let apiError = false;
  try {
    const [p, c] = await Promise.all([apiClient.listProducts(), apiClient.listCategories()]);
    allProducts = p.map(adaptProduct).filter((x) => x.isActive);
    categories = c.map(adaptCategory);
  } catch (err) {
    console.error("[products] failed to load data from api-gateway:", err);
    apiError = true;
  }

  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const minNum = min ? Number(min) : null;
  const maxNum = max ? Number(max) : null;
  const qLower = q?.toLowerCase().trim();
  const products = allProducts.filter((p) => {
    if (qLower) {
      const haystack = `${p.name} ${p.description} ${p.sku}`.toLowerCase();
      if (!haystack.includes(qLower)) return false;
    }
    if (category) {
      const c = p.categoryId ? categoriesById.get(p.categoryId) : null;
      if (!c || c.slug !== category) return false;
    }
    if (wall && p.wallType !== wall) return false;
    if (minNum !== null && Number.isFinite(minNum) && p.price < minNum) return false;
    if (maxNum !== null && Number.isFinite(maxNum) && p.price > maxNum) return false;
    return true;
  });

  const wallTypes = Array.from(new Set(allProducts.map((p) => p.wallType).filter(Boolean))).sort();

  return (
    <div className="container-x py-8 grid md:grid-cols-[16rem_1fr] gap-6">
      <aside className="card p-4 h-fit">
        <form className="space-y-4" method="get">
          <div>
            <label className="label" htmlFor="q">Recherche</label>
            <input id="q" name="q" defaultValue={q} className="input" placeholder="Carton, référence…" />
          </div>
          <div>
            <label className="label" htmlFor="category">Catégorie</label>
            <select id="category" name="category" defaultValue={category} className="select">
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="wall">Type de cannelure</label>
            <select id="wall" name="wall" defaultValue={wall} className="select">
              <option value="">Tous</option>
              {wallTypes.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="min">Min</label>
              <input id="min" name="min" type="number" step="0.01" min="0" defaultValue={min} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="max">Max</label>
              <input id="max" name="max" type="number" step="0.01" min="0" defaultValue={max} className="input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">Appliquer</button>
            <Link href="/products" className="btn-secondary">Réinitialiser</Link>
          </div>
        </form>
      </aside>
      <section>
        <h1 className="text-2xl font-bold text-kraft-900 mb-4">Tous les produits</h1>
        {apiError ? (
          <div className="card p-8 text-center text-amber-900 bg-amber-50 border border-amber-300">
            Notre catalogue est temporairement indisponible. Veuillez réessayer sous peu.
          </div>
        ) : products.length === 0 ? (
          <div className="card p-8 text-center text-kraft-600">Aucun produit ne correspond à vos filtres.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
