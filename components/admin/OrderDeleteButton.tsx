"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readJsonOrSignOut } from "@/lib/client-fetch";

/**
 * Permanently deletes an order via the admin API. Variants:
 *   - `redirectTo` set: navigate there after deletion (used on detail page).
 *   - `redirectTo` unset: refresh the current route (used on list rows).
 */
export function OrderDeleteButton({
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
        className ??
        "text-red-600 hover:underline text-sm disabled:opacity-50"
      }
      disabled={loading}
      onClick={async () => {
        if (!confirm(`Supprimer définitivement la commande ${id} ?`)) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          await readJsonOrSignOut(res);
          if (redirectTo) {
            router.push(redirectTo);
          }
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
