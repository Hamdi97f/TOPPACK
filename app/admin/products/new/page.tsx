import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">New Product</h1>
      <ProductForm categories={categories} mode={{ kind: "create" }} />
    </div>
  );
}
