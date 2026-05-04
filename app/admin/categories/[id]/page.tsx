import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adaptCategory, apiClient } from "@/lib/api-client";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/categories");
  const { id } = await params;
  const categories = await apiClient.listCategories(session.user.apiToken);
  const raw = categories.find((c) => c.id === id);
  if (!raw) notFound();
  const category = adaptCategory(raw);
  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Modifier la catégorie</h1>
      <CategoryForm mode={{ kind: "edit", category }} />
    </div>
  );
}
