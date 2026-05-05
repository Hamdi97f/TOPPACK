"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readJsonOrSignOut } from "@/lib/client-fetch";

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

// Keep this in sync with MAX_BYTES in app/api/admin/products/[id]/image/route.ts.
// Netlify Functions cap request payloads at ~6 MB after base64 encoding,
// so we refuse anything > 4 MB client-side.
const MAX_BYTES = 4 * 1024 * 1024;

export function ProductForm({ categories, mode }: { categories: ProductFormCategory[]; mode: Mode }) {
  const router = useRouter();
  const isEdit = mode.kind === "edit";
  const initial = isEdit ? mode.product : null;
  const [imageUrl, setImageUrl] = useState<string>(initial?.imageUrl ?? "");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Manage object URL lifecycle for the staged file preview.
  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPendingFile(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("Fichier trop volumineux (4 Mo maximum)");
      e.target.value = "";
      setPendingFile(null);
      return;
    }
    setPendingFile(file);
    setError(null);
  }

  async function uploadImageFor(productId: string, file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/image`, {
      method: "POST",
      body: fd,
    });
    const data = await readJsonOrSignOut<{ image_url: string }>(res);
    return data.image_url;
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
      // When a new file is staged we keep the existing `imageUrl` in the
      // payload so an upload failure doesn't blank the product image; the
      // subsequent per-product image upload will then atomically replace it
      // with the new public URL.
      imageUrl: imageUrl || null,
    };
    const url = isEdit
      ? `/api/admin/products/${(mode as { kind: "edit"; product: ProductFormProduct }).product.id}`
      : "/api/admin/products";
    const method = isEdit ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await readJsonOrSignOut<{ product?: { id: string } }>(res);
      const productId = isEdit
        ? (mode as { kind: "edit"; product: ProductFormProduct }).product.id
        : saved.product?.id;
      // If the admin staged a new file, upload it now that the product exists.
      // The api-gateway atomically updates `image_url` on the product.
      if (pendingFile) {
        if (!productId) {
          setError("Produit enregistré, mais identifiant manquant pour téléverser l'image");
          setSubmitting(false);
          return;
        }
        try {
          const newUrl = await uploadImageFor(productId, pendingFile);
          setImageUrl(newUrl);
        } catch (err) {
          // The product was saved successfully; surface the upload failure but
          // do not lose the user's edits.
          setError(
            err instanceof Error
              ? `Produit enregistré, mais échec du téléversement de l'image : ${err.message}`
              : "Produit enregistré, mais échec du téléversement de l'image"
          );
          setSubmitting(false);
          return;
        }
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
      setSubmitting(false);
    }
  }

  const displayedImage = previewUrl || imageUrl || null;

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4 max-w-3xl">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="name">Nom</label>
          <input id="name" name="name" required defaultValue={initial?.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="slug">Identifiant URL (slug)</label>
          <input id="slug" name="slug" required pattern="[a-z0-9\-]+" defaultValue={initial?.slug} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sku">Référence (SKU)</label>
          <input id="sku" name="sku" required defaultValue={initial?.sku} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="categoryId">Catégorie</label>
          <select id="categoryId" name="categoryId" required defaultValue={initial?.categoryId ?? ""} className="select">
            <option value="" disabled>Sélectionner…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="wallType">Type de cannelure</label>
          <input id="wallType" name="wallType" required defaultValue={initial?.wallType ?? "Simple cannelure"} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="price">Prix (DT)</label>
          <input id="price" name="price" type="number" step="0.001" min="0" required defaultValue={initial?.price ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="stock">Stock</label>
          <input id="stock" name="stock" type="number" min="0" required defaultValue={initial?.stock ?? 0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lengthCm">Longueur (cm)</label>
          <input id="lengthCm" name="lengthCm" type="number" step="0.1" min="0" required defaultValue={initial?.lengthCm ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="widthCm">Largeur (cm)</label>
          <input id="widthCm" name="widthCm" type="number" step="0.1" min="0" required defaultValue={initial?.widthCm ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="heightCm">Hauteur (cm)</label>
          <input id="heightCm" name="heightCm" type="number" step="0.1" min="0" required defaultValue={initial?.heightCm ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={4} required defaultValue={initial?.description} className="textarea" />
      </div>
      <div>
        <label className="label">Image</label>
        {displayedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayedImage} alt="" className="w-32 h-32 object-cover rounded mb-2" />
        )}
        <input type="file" accept="image/*" onChange={onPickFile} disabled={submitting} />
        <div className="text-xs text-kraft-600 mt-1">
          {pendingFile
            ? `Sera téléversé à l'enregistrement : ${pendingFile.name}`
            : "Sélectionnez une image (jpg, png, webp, gif — 4 Mo max)."}
        </div>
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} /> Actif
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" defaultChecked={initial?.isFeatured ?? false} /> Mis en avant
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Créer le produit"}
        </button>
      </div>
    </form>
  );
}
