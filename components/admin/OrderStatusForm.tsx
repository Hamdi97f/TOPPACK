"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, statusLabel } from "@/lib/utils";
import { readJsonOrSignOut } from "@/lib/client-fetch";

export function OrderStatusForm({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      await readJsonOrSignOut(res);
      // Re-render the server component lazily so the "Statut :" summary line
      // (and any other places that show the status) reflect the new value.
      // The catalog cache in api-client makes this re-render cheap because
      // listProducts no longer round-trips on every refresh.
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Échec de la mise à jour");
      setValue(status);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      className="select max-w-[12rem] print:hidden"
      value={value}
      disabled={saving}
      onChange={(e) => { setValue(e.target.value); save(e.target.value); }}
    >
      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
    </select>
  );
}
