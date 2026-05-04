import { notFound } from "next/navigation";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { AddToCartButton } from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [allProducts, allCategories] = await Promise.all([
    apiClient.listProducts(),
    apiClient.listCategories(),
  ]);
  const products = allProducts.map(adaptProduct);
  const product = products.find((p) => p.slug === slug);
  if (!product || !product.isActive) notFound();
  const category = product.categoryId
    ? allCategories.map(adaptCategory).find((c) => c.id === product.categoryId)
    : null;

  return (
    <div className="container-x py-8 grid md:grid-cols-2 gap-8">
      <div className="card aspect-square bg-kraft-100 flex items-center justify-center text-9xl">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <span aria-hidden>📦</span>
        )}
      </div>
      <div>
        {category && <div className="text-sm text-kraft-600">{category.name}</div>}
        <h1 className="text-3xl font-bold text-kraft-900 mt-1">{product.name}</h1>
        <div className="text-2xl font-bold text-kraft-800 mt-3">{formatPrice(product.price)}</div>
        <p className="mt-4 text-kraft-800 whitespace-pre-line">{product.description}</p>

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
          />
        </div>
      </div>
    </div>
  );
}
