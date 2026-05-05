"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import { META_PIXEL_ID_RE, type IntegrationsSettings } from "@/lib/site-settings";

export function IntegrationsForm({ initial }: { initial: IntegrationsSettings }) {
  const router = useRouter();
  const [data, setData] = useState<IntegrationsSettings>(initial);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof IntegrationsSettings>(key: K, value: IntegrationsSettings[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (data.metaPixelId && !META_PIXEL_ID_RE.test(data.metaPixelId.trim())) {
      setError("L'identifiant du Pixel doit contenir uniquement des chiffres.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await readJsonOrSignOut(res);
      setSuccess("Paramètres enregistrés.");
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

      <section className="space-y-3">
        <header>
          <h2 className="font-semibold text-kraft-900">Meta (Facebook) Pixel &amp; Conversions API</h2>
          <p className="text-sm text-kraft-700">
            Renseignez votre identifiant de Pixel pour activer le suivi côté navigateur.
            Ajoutez un jeton d&apos;accès Conversions API pour envoyer également les
            événements depuis le serveur (recommandé pour fiabiliser le suivi).
          </p>
        </header>
        <div>
          <label className="label" htmlFor="metaPixelId">Identifiant du Pixel</label>
          <input
            id="metaPixelId" type="text" inputMode="numeric" autoComplete="off"
            placeholder="ex. 1234567890123456"
            value={data.metaPixelId}
            onChange={(e) => set("metaPixelId", e.target.value.replace(/\D+/g, ""))}
            className="input font-mono"
          />
          <p className="text-xs text-kraft-600 mt-1">Laisser vide pour désactiver le Pixel.</p>
        </div>
        <div>
          <label className="label" htmlFor="metaCapiToken">Jeton d&apos;accès Conversions API</label>
          <div className="flex gap-2">
            <input
              id="metaCapiToken"
              type={showToken ? "text" : "password"}
              autoComplete="off" spellCheck={false}
              value={data.metaCapiToken}
              onChange={(e) => set("metaCapiToken", e.target.value)}
              className="input font-mono"
            />
            <button type="button" onClick={() => setShowToken((v) => !v)} className="btn-secondary text-sm">
              {showToken ? "Cacher" : "Afficher"}
            </button>
          </div>
          <p className="text-xs text-kraft-600 mt-1">
            Stocké côté serveur ; jamais exposé au navigateur. Laisser vide pour désactiver les
            événements serveur.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="metaCapiTestEventCode">Code d&apos;événement de test (facultatif)</label>
          <input
            id="metaCapiTestEventCode" type="text" autoComplete="off"
            placeholder="TEST12345"
            value={data.metaCapiTestEventCode}
            onChange={(e) => set("metaCapiTestEventCode", e.target.value)}
            className="input font-mono"
          />
          <p className="text-xs text-kraft-600 mt-1">
            Utilisé pour le débogage dans le « Test des événements » du Gestionnaire d&apos;événements
            Meta. À retirer en production.
          </p>
        </div>
      </section>

      <div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
