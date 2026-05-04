import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { AddToCartButton } from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { category: true },
  });
  if (!product || !product.isActive) notFound();

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
        <div className="text-sm text-kraft-600">{product.category.name}</div>
        <h1 className="text-3xl font-bold text-kraft-900 mt-1">{product.name}</h1>
        <div className="text-2xl font-bold text-kraft-800 mt-3">{formatPrice(product.price)}</div>
        <p className="mt-4 text-kraft-800 whitespace-pre-line">{product.description}</p>

        <table className="mt-6 w-full text-sm card overflow-hidden">
          <tbody>
            <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">SKU</td><td className="p-2">{product.sku}</td></tr>
            <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Wall Type</td><td className="p-2">{product.wallType}</td></tr>
            <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Length</td><td className="p-2">{product.lengthCm} cm</td></tr>
            <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Width</td><td className="p-2">{product.widthCm} cm</td></tr>
            <tr className="border-b border-kraft-100"><td className="p-2 font-medium text-kraft-700">Height</td><td className="p-2">{product.heightCm} cm</td></tr>
            <tr><td className="p-2 font-medium text-kraft-700">Stock</td><td className="p-2">{product.stock > 0 ? `${product.stock} available` : "Out of stock"}</td></tr>
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
