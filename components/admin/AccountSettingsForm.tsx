"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import type { AccountSettings } from "@/lib/site-settings";

export function AccountSettingsForm({ initial }: { initial: AccountSettings }) {
  const router = useRouter();
  const [requireAccount, setRequireAccount] = useState(initial.requireAccountForOrder);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireAccountForOrder: requireAccount }),
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
    <form onSubmit={onSubmit} className="card p-4 sm:p-6 space-y-4">
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded text-sm">{success}</div>}

      <fieldset className="space-y-3">
        <legend className="font-semibold text-kraft-900">Mode de commande</legend>
        <label className="flex items-start gap-2">
          <input
            type="radio" name="mode" className="mt-1"
            checked={!requireAccount}
            onChange={() => setRequireAccount(false)}
          />
          <span>
            <span className="font-medium">Commande invitée autorisée</span>
            <span className="block text-sm text-kraft-700">
              Les clients peuvent passer commande sans créer de compte (comportement
              par défaut).
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="radio" name="mode" className="mt-1"
            checked={requireAccount}
            onChange={() => setRequireAccount(true)}
          />
          <span>
            <span className="font-medium">Compte obligatoire</span>
            <span className="block text-sm text-kraft-700">
              Les clients doivent se connecter ou s&apos;inscrire avant de pouvoir
              passer commande.
            </span>
          </span>
        </label>
      </fieldset>

      <div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
