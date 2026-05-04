import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { products: { where: { isActive: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!category) notFound();
  return (
    <div className="container-x py-8">
      <h1 className="text-2xl font-bold text-kraft-900">{category.name}</h1>
      {category.description && <p className="text-kraft-700 mt-1">{category.description}</p>}
      <div className="mt-6">
        {category.products.length === 0 ? (
          <div className="card p-8 text-center text-kraft-600">No products yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {category.products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
