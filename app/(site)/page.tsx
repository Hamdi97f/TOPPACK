import Link from "next/link";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

async function loadHomeData() {
  try {
    const [products, categories] = await Promise.all([
      apiClient.listProducts(),
      apiClient.listCategories(),
    ]);
    const featured = products.map(adaptProduct).filter((p) => p.isActive && p.isFeatured).slice(0, 8);
    return { featured, categories: categories.map(adaptCategory), apiError: false };
  } catch (err) {
    console.error("[home] failed to load data from api-gateway:", err);
    return { featured: [], categories: [], apiError: true };
  }
}

export default async function HomePage() {
  const { featured, categories, apiError } = await loadHomeData();

  return (
    <>
      <section className="bg-gradient-to-br from-kraft-100 to-kraft-200">
        <div className="container-x py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-kraft-900 leading-tight">
              Corrugated Cardboard Boxes for Every Business
            </h1>
            <p className="mt-4 text-lg text-kraft-800">
              Single wall, double wall, mailer and custom-printed boxes — engineered for safe
              shipping and built to your specifications.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/products" className="btn-primary">Shop Boxes</Link>
              <Link href="/contact" className="btn-secondary">Request a Quote</Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="text-[10rem]" aria-hidden>📦</div>
          </div>
        </div>
      </section>

      <section className="container-x py-12 grid md:grid-cols-3 gap-6">
        {[
          { t: "Custom Sizes", d: "Built to your exact dimensions and wall strength." },
          { t: "Bulk Pricing", d: "Volume discounts for businesses and resellers." },
          { t: "Fast Shipping", d: "Most orders ship within 48 hours from our warehouse." },
        ].map((v) => (
          <div key={v.t} className="card p-6">
            <div className="font-bold text-kraft-800 text-lg">{v.t}</div>
            <p className="text-sm text-kraft-700 mt-1">{v.d}</p>
          </div>
        ))}
      </section>

      {apiError && (
        <section className="container-x py-4">
          <div className="card p-4 border border-amber-300 bg-amber-50 text-amber-900 text-sm">
            Our catalog is temporarily unavailable. Please try again in a few moments
            or <Link href="/contact" className="underline font-semibold">contact us</Link> for
            an immediate quote.
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="container-x py-8">
          <h2 className="text-2xl font-bold text-kraft-900 mb-4">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`} className="card p-6 hover:shadow-md transition">
                <div className="text-3xl mb-2" aria-hidden>📦</div>
                <div className="font-semibold text-kraft-800">{c.name}</div>
                <p className="text-xs text-kraft-600 mt-1 line-clamp-2">{c.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="container-x py-12">
          <h2 className="text-2xl font-bold text-kraft-900 mb-4">Featured Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
