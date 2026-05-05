"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readJsonOrSignOut } from "@/lib/client-fetch";

export function DevisDeleteButton({
  id,
  redirectTo,
  className,
  label = "Supprimer",
}: {
  id: string;
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className={
        className ?? "text-red-600 hover:underline text-sm disabled:opacity-50"
      }
      disabled={loading}
      onClick={async () => {
        if (!confirm("Supprimer définitivement cette demande de devis ?")) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/devis/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          await readJsonOrSignOut(res);
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        } catch (err) {
          alert(err instanceof Error ? err.message : "Échec de la suppression");
          setLoading(false);
        }
      }}
    >
      {loading ? "Suppression…" : label}
    </button>
  );
}
