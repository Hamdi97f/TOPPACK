import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; category?: string; wall?: string; min?: string; max?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q, category, wall, min, max } = await searchParams;
  const where: Record<string, unknown> = { isActive: true };
  if (q) where.OR = [
    { name: { contains: q } },
    { description: { contains: q } },
    { sku: { contains: q } },
  ];
  if (category) where.category = { slug: category };
  if (wall) where.wallType = wall;
  const priceFilter: Record<string, number> = {};
  if (min) priceFilter.gte = Number(min);
  if (max) priceFilter.lte = Number(max);
  if (Object.keys(priceFilter).length) where.price = priceFilter;

  const [products, categories, wallTypesRaw] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, distinct: ["wallType"], select: { wallType: true } }),
  ]);
  const wallTypes = wallTypesRaw.map((p) => p.wallType).sort();

  return (
    <div className="container-x py-8 grid md:grid-cols-[16rem_1fr] gap-6">
      <aside className="card p-4 h-fit">
        <form className="space-y-4" method="get">
          <div>
            <label className="label" htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={q} className="input" placeholder="Box, SKU…" />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue={category} className="select">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="wall">Wall type</label>
            <select id="wall" name="wall" defaultValue={wall} className="select">
              <option value="">Any</option>
              {wallTypes.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="min">Min $</label>
              <input id="min" name="min" type="number" step="0.01" min="0" defaultValue={min} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="max">Max $</label>
              <input id="max" name="max" type="number" step="0.01" min="0" defaultValue={max} className="input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">Apply</button>
            <Link href="/products" className="btn-secondary">Reset</Link>
          </div>
        </form>
      </aside>
      <section>
        <h1 className="text-2xl font-bold text-kraft-900 mb-4">All Products</h1>
        {products.length === 0 ? (
          <div className="card p-8 text-center text-kraft-600">No products match your filters.</div>
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
