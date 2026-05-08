import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ExpandableDescription } from "@/components/ExpandableDescription";

export const revalidate = 60;

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [allProducts, allCategories, siteSettings] = await Promise.all([
    apiClient.listProducts(),
    apiClient.listCategories(),
    apiClient.getSiteSettings(),
  ]);
  const products = allProducts.map(adaptProduct);
  const product = products.find((p) => p.slug === slug);
  if (!product || !product.isActive) notFound();
  const category = product.categoryId
    ? allCategories.map(adaptCategory).find((c) => c.id === product.categoryId)
    : null;

  const canCompare3D = siteSettings.boxComparator.enabled
    && product.lengthCm > 0
    && product.widthCm > 0
    && product.heightCm > 0;

  return (
    <div className="container-x py-6 sm:py-8 grid md:grid-cols-2 gap-6 sm:gap-8">
      <div className="card aspect-square bg-kraft-100 flex items-center justify-center text-9xl relative overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
            className="object-cover rounded-lg"
          />
        ) : (
          <span aria-hidden>📦</span>
        )}
        {canCompare3D && (
          <Link
            href={{
              pathname: "/box-comparator",
              query: {
                l: Math.round(product.lengthCm * 10),
                w: Math.round(product.widthCm * 10),
                h: Math.round(product.heightCm * 10),
                name: product.name,
              },
            }}
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-kraft-900 shadow-md ring-1 ring-kraft-200 hover:bg-white hover:shadow-lg transition"
            aria-label={`Comparer ${product.name} en 3D avec des objets du quotidien`}
          >
            <span aria-hidden>🧊</span>
            <span>Comparer en 3D</span>
          </Link>
        )}
      </div>
      <div>
        {category && <div className="text-sm text-kraft-600">{category.name}</div>}
        <h1 className="text-2xl sm:text-3xl font-bold text-kraft-900 mt-1">{product.name}</h1>
        {product.promoPrice != null && product.regularPrice != null ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-2 sm:gap-3">
            <span className="text-2xl font-bold text-red-700">{formatPrice(product.price)}</span>
            <span className="text-base sm:text-lg text-kraft-500 line-through">{formatPrice(product.regularPrice)}</span>
            <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">Promo</span>
          </div>
        ) : (
          <div className="text-2xl font-bold text-kraft-800 mt-3">{formatPrice(product.price)}</div>
        )}
        <ExpandableDescription text={product.description ?? ""} />

        <table className="mt-6 w-full text-sm card overflow-hidden">
          <tbody>
            {product.sku && <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Référence</td><td className="p-2">{product.sku}</td></tr>}
            {product.wallType && <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Type de cannelure</td><td className="p-2">{product.wallType}</td></tr>}
            {product.lengthCm > 0 && <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Longueur</td><td className="p-2">{product.lengthCm} cm</td></tr>}
            {product.widthCm > 0 && <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Largeur</td><td className="p-2">{product.widthCm} cm</td></tr>}
            {product.heightCm > 0 && <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Hauteur</td><td className="p-2">{product.heightCm} cm</td></tr>}
            <tr><td className="p-2 font-medium text-kraft-700">Stock</td><td className="p-2">{product.stock > 0 ? `${product.stock} disponibles` : "Rupture de stock"}</td></tr>
          </tbody>
        </table>

        <div className="mt-6">
          <AddToCartButton
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
            }}
            disabled={product.stock <= 0}
            checkoutSettings={siteSettings.checkout}
            shipping={siteSettings.shipping}
            requireAccount={siteSettings.account.requireAccountForOrder}
          />
        </div>

      </div>
    </div>
  );
}
