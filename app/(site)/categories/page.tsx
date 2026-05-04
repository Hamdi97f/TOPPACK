import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <div className="container-x py-8">
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Categories</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((c) => (
          <Link key={c.id} href={`/categories/${c.slug}`} className="card p-6 hover:shadow-md transition">
            <div className="font-semibold text-kraft-800 text-lg">{c.name}</div>
            <p className="text-sm text-kraft-700 mt-1">{c.description}</p>
            <div className="text-xs text-kraft-600 mt-2">{c._count.products} products</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
