"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEVIS_STATUSES, devisStatusLabel, type DevisStatus } from "@/lib/devis";
import { readJsonOrSignOut } from "@/lib/client-fetch";

export function DevisStatusForm({ id, status }: { id: string; status: DevisStatus }) {
  const router = useRouter();
  const [value, setValue] = useState<DevisStatus>(status);
  const [saving, setSaving] = useState(false);

  async function save(next: DevisStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/devis/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      await readJsonOrSignOut(res);
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
      className="select max-w-[14rem]"
      value={value}
      disabled={saving}
      onChange={(e) => {
        const next = e.target.value as DevisStatus;
        setValue(next);
        void save(next);
      }}
    >
      {DEVIS_STATUSES.map((s) => (
        <option key={s} value={s}>{devisStatusLabel(s)}</option>
      ))}
    </select>
  );
}
