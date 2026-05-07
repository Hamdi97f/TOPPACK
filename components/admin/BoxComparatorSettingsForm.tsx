"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import type { BoxComparatorSettings } from "@/lib/site-settings";

export function BoxComparatorSettingsForm({ initial }: { initial: BoxComparatorSettings }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/box-comparator", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
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
        <legend className="font-semibold text-kraft-900">Visibilité de la page</legend>
        <label className="flex items-start gap-2">
          <input
            type="radio" name="visibility" className="mt-1"
            checked={enabled}
            onChange={() => setEnabled(true)}
          />
          <span>
            <span className="font-medium">Page publiée</span>
            <span className="block text-sm text-kraft-700">
              La page <code>/box-comparator</code> et son lien dans le menu
              sont visibles par tous les visiteurs.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="radio" name="visibility" className="mt-1"
            checked={!enabled}
            onChange={() => setEnabled(false)}
          />
          <span>
            <span className="font-medium">Page masquée</span>
            <span className="block text-sm text-kraft-700">
              Le lien est masqué et la page renvoie 404 pour les visiteurs.
              Les administrateurs peuvent toujours la prévisualiser.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <Link
          href="/box-comparator"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-kraft-700 hover:text-kraft-900 underline"
        >
          Aperçu de la page →
        </Link>
      </div>
    </form>
  );
}
