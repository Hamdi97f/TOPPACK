import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/safe-query";
import { DbErrorBanner } from "@/components/admin/DbErrorBanner";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim();
  const result = await safeQuery(
    "user.findMany",
    () =>
      prisma.user.findMany({
        where: {
          role: "CUSTOMER",
          ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { orders: true } } },
        take: 200,
      }),
    [] as Awaited<ReturnType<typeof prisma.user.findMany<{ include: { _count: { select: { orders: true } } } }>>>
  );
  const users = result.data;
  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Customers</h1>
      {!result.ok && <DbErrorBanner error={result.error} />}
      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder="Search by name or email…" className="input max-w-sm" />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-kraft-100 text-kraft-800">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-right p-2">Orders</th>
              <th className="text-left p-2">Joined</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-kraft-100">
                <td className="p-2"><Link href={`/admin/customers/${u.id}`} className="hover:text-kraft-700 font-medium">{u.name}</Link></td>
                <td className="p-2">{u.email}</td>
                <td className="p-2 text-right">{u._count.orders}</td>
                <td className="p-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-2">
                  <span className={`badge ${u.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-800"}`}>
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-kraft-600">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
