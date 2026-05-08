"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import {
  WINSMS_SENDER_ID_RE,
  type WinSmsSettings,
} from "@/lib/site-settings";

export function WinSmsSettingsForm({ initial }: { initial: WinSmsSettings }) {
  const router = useRouter();
  const [data, setData] = useState<WinSmsSettings>(initial);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof WinSmsSettings>(key: K, value: WinSmsSettings[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (data.enabled && !data.apiKey.trim()) {
      setError("Renseignez la clé API WinSMS pour activer la fonctionnalité.");
      return;
    }
    if (data.senderId && !WINSMS_SENDER_ID_RE.test(data.senderId.trim())) {
      setError(
        "Le Sender ID doit contenir 1 à 11 caractères (lettres, chiffres, espaces, tirets)."
      );
      return;
    }
    if (data.enabled && !data.senderId.trim()) {
      setError("Renseignez un Sender ID pour activer la fonctionnalité.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/winsms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const saved = await readJsonOrSignOut<{ winsms: WinSmsSettings }>(res);
      if (saved?.winsms) setData(saved.winsms);
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
          <h2 className="font-semibold text-kraft-900">Auto-confirmation par SMS</h2>
          <p className="text-sm text-kraft-700">
            Lorsque cette fonctionnalité est active, le client peut confirmer sa
            commande lui-même en saisissant un code OTP reçu par SMS. La
            commande passe alors automatiquement au statut « Confirmée ».
          </p>
        </header>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          <span className="text-sm text-kraft-800">
            Activer la confirmation par SMS sur la page de remerciement
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="font-semibold text-kraft-900">Identifiants WinSMS</h2>
          <p className="text-sm text-kraft-700">
            Récupérez votre clé API depuis votre tableau de bord WinSMS, section
            « SMS API ». Le Sender ID est l&apos;identifiant approuvé qui
            apparaîtra comme expéditeur du SMS (ex. « TOPPACK »).
          </p>
        </header>
        <div>
          <label className="label" htmlFor="apiKey">Clé API</label>
          <div className="flex gap-2">
            <input
              id="apiKey"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={data.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
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
          <p className="text-xs text-kraft-600 mt-1">
            Stockée côté serveur ; jamais exposée au navigateur.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="senderId">Sender ID</label>
          <input
            id="senderId"
            type="text"
            autoComplete="off"
            placeholder="ex. TOPPACK"
            maxLength={11}
            value={data.senderId}
            onChange={(e) => set("senderId", e.target.value)}
            className="input font-mono"
          />
          <p className="text-xs text-kraft-600 mt-1">
            1 à 11 caractères. Doit être un identifiant approuvé par WinSMS.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="otpMessage">Modèle de message</label>
          <textarea
            id="otpMessage"
            rows={3}
            maxLength={320}
            value={data.otpMessage}
            onChange={(e) => set("otpMessage", e.target.value)}
            className="textarea"
          />
          <p className="text-xs text-kraft-600 mt-1">
            Utilisez <code>{"{code}"}</code> pour insérer le code à 6 chiffres.
            Si <code>{"{code}"}</code> est absent, le code est ajouté à la fin
            du message.
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
