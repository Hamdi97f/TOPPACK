import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">Edit Category</h1>
      <CategoryForm mode={{ kind: "edit", category }} />
    </div>
  );
}
