"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readJsonOrSignOut } from "@/lib/client-fetch";

export type CategoryFormCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type Mode = { kind: "create" } | { kind: "edit"; category: CategoryFormCategory };

export function CategoryForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isEdit = mode.kind === "edit";
  const initial = isEdit ? mode.category : null;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      description: (fd.get("description") as string) || null,
    };
    const url = isEdit ? `/api/admin/categories/${(mode as { kind: "edit"; category: CategoryFormCategory }).category.id}` : "/api/admin/categories";
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await readJsonOrSignOut(res);
      router.push("/admin/categories");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4 max-w-xl">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
      <div>
        <label className="label" htmlFor="name">Nom</label>
        <input id="name" name="name" required defaultValue={initial?.name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={initial?.description ?? ""} className="textarea" />
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Créer la catégorie"}
      </button>
    </form>
  );
}
