"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import {
  type BrandingSettings,
  DEFAULT_SITE_TITLE,
  DEFAULT_SITE_DESCRIPTION,
  isSafeAssetUrl,
} from "@/lib/site-settings";

// Keep this in sync with MAX_BYTES in
// app/api/admin/settings/branding/upload/route.ts.
const MAX_BYTES = 2 * 1024 * 1024;

type Kind = "social" | "favicon";

export function BrandingForm({ initial }: { initial: BrandingSettings }) {
  const router = useRouter();
  const [data, setData] = useState<BrandingSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Kind | null>(null);

  const socialInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

  function set<K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadAsset(kind: Kind, file: File) {
    setError(null);
    setSuccess(null);
    if (file.size > MAX_BYTES) {
      setError("Fichier trop volumineux (2 Mo maximum)");
      return;
    }
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/admin/settings/branding/upload", {
        method: "POST",
        body: fd,
      });
      const json = await readJsonOrSignOut<{ url: string }>(res);
      if (kind === "favicon") set("faviconUrl", json.url);
      else set("socialImageUrl", json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du téléversement");
    } finally {
      setUploading(null);
    }
  }

  function onPickFile(kind: Kind) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset the input so picking the same file again still triggers change.
      e.target.value = "";
      if (file) void uploadAsset(kind, file);
    };
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    // Reject obviously dangerous URLs client-side; the server re-validates.
    if (data.socialImageUrl && !isSafeAssetUrl(data.socialImageUrl)) {
      setError("URL d'image sociale invalide");
      return;
    }
    if (data.faviconUrl && !isSafeAssetUrl(data.faviconUrl)) {
      setError("URL de favicon invalide");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await readJsonOrSignOut(res);
      setSuccess("Identité du site enregistrée.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 sm:p-6 space-y-6">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded text-sm">{success}</div>}

      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="siteTitle">Titre du site</label>
          <input
            id="siteTitle"
            type="text"
            value={data.siteTitle}
            onChange={(e) => set("siteTitle", e.target.value)}
            placeholder={DEFAULT_SITE_TITLE}
            maxLength={200}
            className="input"
          />
          <p className="text-xs text-kraft-700 mt-1">
            Apparaît dans l&apos;onglet du navigateur, les résultats de recherche
            et les partages sur les réseaux sociaux.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="siteDescription">Description du site</label>
          <textarea
            id="siteDescription"
            rows={3}
            value={data.siteDescription}
            onChange={(e) => set("siteDescription", e.target.value)}
            placeholder={DEFAULT_SITE_DESCRIPTION}
            maxLength={500}
            className="textarea"
          />
          <p className="text-xs text-kraft-700 mt-1">
            Texte court (≤ 500 caractères) utilisé par les moteurs de recherche
            et les aperçus de partage.
          </p>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-kraft-900">Image de partage social</legend>
        <p className="text-sm text-kraft-700">
          Image affichée lorsque votre site est partagé sur Facebook, LinkedIn,
          Twitter, etc. (recommandé : 1200×630&nbsp;px, JPG/PNG/WebP).
        </p>
        <div className="flex items-start gap-4">
          {data.socialImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.socialImageUrl}
              alt="Aperçu image sociale"
              className="w-32 h-20 object-cover border border-kraft-200 rounded bg-white"
            />
          ) : (
            <div className="w-32 h-20 border border-dashed border-kraft-300 rounded flex items-center justify-center text-xs text-kraft-500 bg-kraft-50">
              Aucune image
            </div>
          )}
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={data.socialImageUrl}
              onChange={(e) => set("socialImageUrl", e.target.value)}
              placeholder="https://… ou /api/files/…"
              className="input"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => socialInputRef.current?.click()}
                disabled={uploading !== null || saving}
              >
                {uploading === "social" ? "Téléversement…" : "Téléverser une image"}
              </button>
              {data.socialImageUrl && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => set("socialImageUrl", "")}
                  disabled={uploading !== null || saving}
                >
                  Retirer
                </button>
              )}
            </div>
            <input
              ref={socialInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onPickFile("social")}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-kraft-900">Favicon</legend>
        <p className="text-sm text-kraft-700">
          Petite icône affichée dans l&apos;onglet du navigateur. Format PNG ou
          ICO recommandé (32×32 ou 64×64&nbsp;px).
        </p>
        <div className="flex items-start gap-4">
          {data.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.faviconUrl}
              alt="Aperçu favicon"
              className="w-12 h-12 object-contain border border-kraft-200 rounded bg-white p-1"
            />
          ) : (
            <div className="w-12 h-12 border border-dashed border-kraft-300 rounded flex items-center justify-center text-[10px] text-kraft-500 bg-kraft-50">
              Aucun
            </div>
          )}
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={data.faviconUrl}
              onChange={(e) => set("faviconUrl", e.target.value)}
              placeholder="https://… ou /api/files/…"
              className="input"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => faviconInputRef.current?.click()}
                disabled={uploading !== null || saving}
              >
                {uploading === "favicon" ? "Téléversement…" : "Téléverser un favicon"}
              </button>
              {data.faviconUrl && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => set("faviconUrl", "")}
                  disabled={uploading !== null || saving}
                >
                  Retirer
                </button>
              )}
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/gif,image/jpeg,.ico"
              className="hidden"
              onChange={onPickFile("favicon")}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <button type="submit" className="btn-primary" disabled={saving || uploading !== null}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
