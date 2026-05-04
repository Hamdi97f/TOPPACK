import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adaptCategory, adaptProduct, apiClient } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { ProductDeleteButton } from "@/components/admin/ProductDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/products");
  const token = session.user.apiToken;

  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim().toLowerCase();

  const [rawProducts, rawCategories] = await Promise.all([
    apiClient.listProducts(token).catch((e) => { console.error("[admin/products] failed", e); return []; }),
    apiClient.listCategories(token).catch((e) => { console.error("[admin/products] categories failed", e); return []; }),
  ]);
  const categoriesById = new Map(rawCategories.map(adaptCategory).map((c) => [c.id, c]));
  const products = rawProducts
    .map(adaptProduct)
    .filter((p) => !q || `${p.name} ${p.sku}`.toLowerCase().includes(q));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-kraft-900">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">New Product</Link>
      </div>
      <form className="mb-4">
        <input name="q" defaultValue={rawQ ?? ""} placeholder="Search by name or SKU…" className="input max-w-sm" />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">SKU</th>
              <th className="text-left p-2">Category</th>
              <th className="text-right p-2">Price</th>
              <th className="text-right p-2">Stock</th>
              <th className="text-left p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-kraft-100">
                <td className="p-2">
                  <Link href={`/admin/products/${p.id}`} className="hover:text-kraft-700 font-medium">{p.name}</Link>
                </td>
                <td className="p-2 font-mono text-xs">{p.sku}</td>
                <td className="p-2">{p.categoryId ? categoriesById.get(p.categoryId)?.name ?? "—" : "—"}</td>
                <td className="p-2 text-right">{formatPrice(p.price)}</td>
                <td className="p-2 text-right">{p.stock}</td>
                <td className="p-2">
                  <span className={`badge ${p.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-2 text-right">
                  <ProductDeleteButton id={p.id} />
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-kraft-600">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
