import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryDeleteButton } from "@/components/admin/CategoryDeleteButton";
import { safeQuery } from "@/lib/safe-query";
import { DbErrorBanner } from "@/components/admin/DbErrorBanner";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const result = await safeQuery(
    "category.findMany",
    () =>
      prisma.category.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } },
      }),
    [] as Awaited<ReturnType<typeof prisma.category.findMany<{ include: { _count: { select: { products: true } } } }>>>
  );
  const categories = result.data;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-kraft-900">Categories</h1>
        <Link href="/admin/categories/new" className="btn-primary">New Category</Link>
      </div>
      {!result.ok && <DbErrorBanner error={result.error} />}
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
