"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category } from "@prisma/client";

type Mode = { kind: "create" } | { kind: "edit"; category: Category };

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
      name: fd.get("name"),
      slug: fd.get("slug"),
      description: fd.get("description") || null,
    };
    const url = isEdit ? `/api/admin/categories/${(mode as { kind: "edit"; category: Category }).category.id}` : "/api/admin/categories";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Save failed"); return; }
    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4 max-w-xl">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={initial?.name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="slug">Slug</label>
        <input id="slug" name="slug" required pattern="[a-z0-9\-]+" defaultValue={initial?.slug} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={initial?.description ?? ""} className="textarea" />
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
      </button>
    </form>
  );
}
