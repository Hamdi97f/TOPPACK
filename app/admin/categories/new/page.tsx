import { CategoryForm } from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-4">New Category</h1>
      <CategoryForm mode={{ kind: "create" }} />
    </div>
  );
}
