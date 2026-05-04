"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES } from "@/lib/utils";

export function OrderStatusForm({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (!res.ok) {
      alert("Update failed");
      setValue(status);
      return;
    }
    router.refresh();
  }

  return (
    <select
      className="select max-w-[12rem] print:hidden"
      value={value}
      disabled={saving}
      onChange={(e) => { setValue(e.target.value); save(e.target.value); }}
    >
      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
