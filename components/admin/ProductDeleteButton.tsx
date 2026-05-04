"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readJsonOrSignOut } from "@/lib/client-fetch";

export function ProductDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className="text-red-600 hover:underline text-sm disabled:opacity-50"
      disabled={loading}
      onClick={async () => {
        if (!confirm("Supprimer ce produit ?")) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
          await readJsonOrSignOut(res);
          router.refresh();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Échec de la suppression");
        } finally {
          setLoading(false);
        }
      }}
    >
      Supprimer
    </button>
  );
}
