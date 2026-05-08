"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import { type MesColisSettings } from "@/lib/site-settings";

export function MesColisSettingsForm({ initial }: { initial: MesColisSettings }) {
  const router = useRouter();
  const [data, setData] = useState<MesColisSettings>(initial);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof MesColisSettings>(key: K, value: MesColisSettings[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (data.enabled && !data.apiToken.trim()) {
      setError("Renseignez le jeton d'accès Mes Colis Express pour activer la fonctionnalité.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/mescolis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const saved = await readJsonOrSignOut<{ mescolis: MesColisSettings }>(res);
      if (saved?.mescolis) setData(saved.mescolis);
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
          <h2 className="font-semibold text-kraft-900">Synchronisation des commandes</h2>
          <p className="text-sm text-kraft-700">
            Lorsque cette fonctionnalité est active, un bouton «&nbsp;Synchroniser
            avec Mes Colis Express&nbsp;» apparaît sur la page des commandes.
            Toutes les commandes confirmées et non encore envoyées sont alors
            transmises en une seule action à la compagnie de livraison.
          </p>
        </header>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          <span className="text-sm text-kraft-800">
            Activer la synchronisation avec Mes Colis Express
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="font-semibold text-kraft-900">Identifiants Mes Colis Express</h2>
          <p className="text-sm text-kraft-700">
            Le jeton d&apos;accès (<code>x-access-token</code>) est fourni par
            l&apos;administrateur système de Mes Colis Express. Il est stocké
            côté serveur et n&apos;est jamais exposé au navigateur des clients.
          </p>
        </header>
        <div>
          <label className="label" htmlFor="apiToken">Jeton d&apos;accès (x-access-token)</label>
          <div className="flex gap-2">
            <input
              id="apiToken"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={data.apiToken}
              onChange={(e) => set("apiToken", e.target.value)}
              className="input font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="btn-secondary text-sm"
            >
              {showKey ? "Cacher" : "Afficher"}
            </button>
          </div>
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
