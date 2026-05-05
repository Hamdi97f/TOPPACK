"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";

export function DevisNotesForm({
  id,
  initialNotes,
}: {
  id: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/devis/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: value }),
      });
      await readJsonOrSignOut(res);
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        className="input min-h-[140px]"
        maxLength={5000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Notes internes (visibles uniquement par l'administration)…"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-kraft-600">
          {savedAt ? "Enregistré." : ""}
        </span>
        <button type="submit" className="btn-primary !py-1 !px-3 text-sm" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
