import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { CategoryDeleteButton } from "@/components/admin/CategoryDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/categories");
  const token = session.user.apiToken;

  const [rawCategories, rawProducts] = await Promise.all([
    apiClient.listCategories(token).catch((e) => { console.error("[admin/categories] failed", e); return []; }),
    apiClient.listProducts(token).catch(() => []),
  ]);
  const categories = rawCategories.map(adaptCategory);
  const counts = new Map<string, number>();
  for (const p of rawProducts.map(adaptProduct)) {
    if (!p.categoryId) continue;
    counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-kraft-900">Catégories</h1>
        <Link href="/admin/categories/new" className="btn-primary">Nouvelle catégorie</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Nom</th>
              <th className="text-left p-2">Identifiant URL</th>
              <th className="text-right p-2">Produits</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-kraft-100">
                <td className="p-2"><Link href={`/admin/categories/${c.id}`} className="hover:text-kraft-700 font-medium">{c.name}</Link></td>
                <td className="p-2 font-mono text-xs">{c.slug}</td>
                <td className="p-2 text-right">{counts.get(c.id) ?? 0}</td>
                <td className="p-2 text-right"><CategoryDeleteButton id={c.id} /></td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-kraft-600">Aucune catégorie pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
