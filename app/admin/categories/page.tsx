import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryDeleteButton } from "@/components/admin/CategoryDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-kraft-900">Categories</h1>
        <Link href="/admin/categories/new" className="btn-primary">New Category</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Slug</th>
              <th className="text-right p-2">Products</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-kraft-100">
                <td className="p-2"><Link href={`/admin/categories/${c.id}`} className="hover:text-kraft-700 font-medium">{c.name}</Link></td>
                <td className="p-2 font-mono text-xs">{c.slug}</td>
                <td className="p-2 text-right">{c._count.products}</td>
                <td className="p-2 text-right"><CategoryDeleteButton id={c.id} /></td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-kraft-600">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
