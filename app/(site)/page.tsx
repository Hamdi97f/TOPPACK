import Link from "next/link";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { ProductCard } from "@/components/ProductCard";
import { resolveRegionsFromSettings } from "@/lib/live-edit/editable";

export const revalidate = 60;

const HOME_REGION_IDS = [
  "home.hero",
  "home.hero.ctaPrimary",
  "home.hero.ctaSecondary",
  "home.values.card1",
  "home.values.card2",
  "home.values.card3",
  "home.categories.heading",
  "home.featured.heading",
];

async function loadHomeData() {
  try {
    const [products, categories, settings] = await Promise.all([
      apiClient.listProducts(),
      apiClient.listCategories(),
      apiClient.getSiteSettings(),
    ]);
    const featured = products.map(adaptProduct).filter((p) => p.isActive && p.isFeatured).slice(0, 8);
    return {
      featured,
      categories: categories.map(adaptCategory),
      apiError: false,
      edits: resolveRegionsFromSettings(settings.liveEdits, HOME_REGION_IDS),
    };
  } catch (err) {
    console.error("[home] failed to load data from api-gateway:", err);
    return {
      featured: [],
      categories: [],
      apiError: true,
      edits: resolveRegionsFromSettings({}, HOME_REGION_IDS),
    };
  }
}

function alignClass(v: unknown): string {
  if (v === "center") return "text-center";
  if (v === "right") return "text-right";
  return "text-left";
}

export default async function HomePage() {
  const { featured, categories, apiError, edits } = await loadHomeData();

  const hero = edits["home.hero"];
  const ctaPrimary = edits["home.hero.ctaPrimary"];
  const ctaSecondary = edits["home.hero.ctaSecondary"];
  const card1 = edits["home.values.card1"];
  const card2 = edits["home.values.card2"];
  const card3 = edits["home.values.card3"];
  const catHeading = edits["home.categories.heading"];
  const featuredHeading = edits["home.featured.heading"];

  return (
    <>
      <section
        data-edit-id="home.hero"
        style={{
          background: `linear-gradient(135deg, ${hero.bgFromColor} 0%, ${hero.bgToColor} 100%)`,
        }}
      >
        <div
          className="container-x grid md:grid-cols-2 gap-10 items-center"
          style={{ paddingTop: `${hero.paddingY}px`, paddingBottom: `${hero.paddingY}px` }}
        >
          <div>
            <h1
              className="text-4xl md:text-5xl font-bold leading-tight"
              style={{ color: String(hero.titleColor) }}
            >
              {hero.title}
            </h1>
            <p className="mt-4 text-lg" style={{ color: String(hero.subtitleColor) }}>
              {hero.subtitle}
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                data-edit-id="home.hero.ctaPrimary"
                href={String(ctaPrimary.href)}
                className="btn-primary"
              >
                {ctaPrimary.label}
              </Link>
              <Link
                data-edit-id="home.hero.ctaSecondary"
                href={String(ctaSecondary.href)}
                className="btn-secondary"
              >
                {ctaSecondary.label}
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="text-[10rem]" aria-hidden>📦</div>
          </div>
        </div>
      </section>

      <section className="container-x py-12 grid md:grid-cols-3 gap-6">
        {[
          { id: "home.values.card1", v: card1 },
          { id: "home.values.card2", v: card2 },
          { id: "home.values.card3", v: card3 },
        ].map(({ id, v }) => (
          <div key={id} data-edit-id={id} className="card p-6">
            <div className="font-bold text-kraft-800 text-lg">{v.title}</div>
            <p className="text-sm text-kraft-700 mt-1">{v.description}</p>
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
          <h2
            data-edit-id="home.categories.heading"
            className={`text-2xl font-bold mb-4 ${alignClass(catHeading.align)}`}
            style={{ color: String(catHeading.color) }}
          >
            {catHeading.text}
          </h2>
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
          <h2
            data-edit-id="home.featured.heading"
            className={`text-2xl font-bold mb-4 ${alignClass(featuredHeading.align)}`}
            style={{ color: String(featuredHeading.color) }}
          >
            {featuredHeading.text}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} p={p} priority={i < 4} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
