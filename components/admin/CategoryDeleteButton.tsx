"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CategoryDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className="text-red-600 hover:underline text-sm disabled:opacity-50"
      disabled={loading}
      onClick={async () => {
        if (!confirm("Delete this category?")) return;
        setLoading(true);
        const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        if (!res.ok) { alert(data.error || "Delete failed"); return; }
        router.refresh();
      }}
    >
      Delete
    </button>
  );
}
