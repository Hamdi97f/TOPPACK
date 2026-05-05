import Link from "next/link";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { ProductCard } from "@/components/ProductCard";

export const revalidate = 60;

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
              Cartons en carton ondulé pour toutes les entreprises
            </h1>
            <p className="mt-4 text-lg text-kraft-800">
              Cartons simple cannelure, double cannelure, enveloppes d&apos;expédition et
              cartons personnalisés — conçus pour une expédition sécurisée et fabriqués
              selon vos spécifications.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/products" className="btn-primary">Acheter des cartons</Link>
              <Link href="/contact" className="btn-secondary">Demander un devis</Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="text-[10rem]" aria-hidden>📦</div>
          </div>
        </div>
      </section>

      <section className="container-x py-12 grid md:grid-cols-3 gap-6">
        {[
          { t: "Tailles personnalisées", d: "Fabriqués à vos dimensions exactes et avec la résistance souhaitée." },
          { t: "Tarifs en gros", d: "Remises sur volume pour les entreprises et les revendeurs." },
          { t: "Livraison rapide", d: "La plupart des commandes sont expédiées sous 48 heures depuis notre entrepôt." },
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
            Notre catalogue est temporairement indisponible. Veuillez réessayer dans
            quelques instants ou <Link href="/contact" className="underline font-semibold">contactez-nous</Link>{" "}
            pour un devis immédiat.
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="container-x py-8">
          <h2 className="text-2xl font-bold text-kraft-900 mb-4">Acheter par catégorie</h2>
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
          <h2 className="text-2xl font-bold text-kraft-900 mb-4">Produits mis en avant</h2>
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
