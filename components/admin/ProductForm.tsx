"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ProductFormProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  wallType: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string | null;
};

export type ProductFormCategory = { id: string; name: string };

type Mode = { kind: "create" } | { kind: "edit"; product: ProductFormProduct };

export function ProductForm({ categories, mode }: { categories: ProductFormCategory[]; mode: Mode }) {
  const router = useRouter();
  const isEdit = mode.kind === "edit";
  const initial = isEdit ? mode.product : null;
  const [imageUrl, setImageUrl] = useState<string>(initial?.imageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { alert(data.error || "Upload failed"); return; }
    setImageUrl(data.url);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      slug: fd.get("slug"),
      description: fd.get("description"),
      sku: fd.get("sku"),
      lengthCm: Number(fd.get("lengthCm")),
      widthCm: Number(fd.get("widthCm")),
      heightCm: Number(fd.get("heightCm")),
      wallType: fd.get("wallType"),
      price: Number(fd.get("price")),
      stock: Number(fd.get("stock")),
      categoryId: fd.get("categoryId"),
      isActive: fd.get("isActive") === "on",
      isFeatured: fd.get("isFeatured") === "on",
      imageUrl: imageUrl || null,
    };
    const url = isEdit ? `/api/admin/products/${(mode as { kind: "edit"; product: ProductFormProduct }).product.id}` : "/api/admin/products";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Save failed"); return; }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4 max-w-3xl">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required defaultValue={initial?.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="slug">Slug</label>
          <input id="slug" name="slug" required pattern="[a-z0-9\-]+" defaultValue={initial?.slug} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sku">SKU</label>
          <input id="sku" name="sku" required defaultValue={initial?.sku} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" required defaultValue={initial?.categoryId ?? ""} className="select">
            <option value="" disabled>Select…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="wallType">Wall Type</label>
          <input id="wallType" name="wallType" required defaultValue={initial?.wallType ?? "Single Wall"} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="price">Price (USD)</label>
          <input id="price" name="price" type="number" step="0.01" min="0" required defaultValue={initial?.price ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="stock">Stock</label>
          <input id="stock" name="stock" type="number" min="0" required defaultValue={initial?.stock ?? 0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lengthCm">Length (cm)</label>
          <input id="lengthCm" name="lengthCm" type="number" step="0.1" min="0" required defaultValue={initial?.lengthCm ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="widthCm">Width (cm)</label>
          <input id="widthCm" name="widthCm" type="number" step="0.1" min="0" required defaultValue={initial?.widthCm ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="heightCm">Height (cm)</label>
          <input id="heightCm" name="heightCm" type="number" step="0.1" min="0" required defaultValue={initial?.heightCm ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={4} required defaultValue={initial?.description} className="textarea" />
      </div>
      <div>
        <label className="label">Image</label>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-32 h-32 object-cover rounded mb-2" />
        )}
        <input type="file" accept="image/*" onChange={onUpload} disabled={uploading} />
        {uploading && <div className="text-xs text-kraft-600 mt-1">Uploading…</div>}
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} /> Active
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" defaultChecked={initial?.isFeatured ?? false} /> Featured
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>
  );
}
