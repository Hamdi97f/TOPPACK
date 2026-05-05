"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import type { ShippingSettings, ShippingTier } from "@/lib/site-settings";

type DraftTier = { id: string; minQuantity: string; fee: string };

let nextId = 0;
function makeId(): string {
  nextId += 1;
  return `t${Date.now()}-${nextId}`;
}

function toDraft(tiers: ShippingTier[]): DraftTier[] {
  return tiers.map((t) => ({
    id: makeId(),
    minQuantity: String(t.minQuantity),
    fee: String(t.fee),
  }));
}

export function ShippingSettingsForm({ initial }: { initial: ShippingSettings }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [tiers, setTiers] = useState<DraftTier[]>(() => toDraft(initial.tiers));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateTier(id: string, patch: Partial<DraftTier>) {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTier(id: string) {
    setTiers((prev) => prev.filter((t) => t.id !== id));
  }

  function addTier() {
    setTiers((prev) => [...prev, { id: makeId(), minQuantity: "", fee: "" }]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Parse + validate locally so the user gets immediate feedback before
    // hitting the server (the server re-validates with the same rules).
    const parsed: ShippingTier[] = [];
    const seen = new Set<number>();
    for (const t of tiers) {
      const min = Number(t.minQuantity);
      const fee = Number(t.fee);
      if (!Number.isFinite(min) || !Number.isInteger(min) || min < 1) {
        setError("Chaque palier doit avoir une quantité minimale entière ≥ 1.");
        return;
      }
      if (!Number.isFinite(fee) || fee < 0) {
        setError("Chaque frais de livraison doit être un nombre positif ou nul.");
        return;
      }
      if (seen.has(min)) {
        setError(`Quantité minimale ${min} déclarée plusieurs fois.`);
        return;
      }
      seen.add(min);
      parsed.push({ minQuantity: min, fee });
    }
    parsed.sort((a, b) => a.minQuantity - b.minQuantity);

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, tiers: parsed }),
      });
      await readJsonOrSignOut(res);
      setSuccess("Paramètres enregistrés.");
      setTiers(toDraft(parsed));
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

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>
          <span className="font-medium">Activer les frais de livraison</span>
          <span className="block text-sm text-kraft-700">
            Lorsque cette option est désactivée, aucun frais n&apos;est ajouté
            au panier ni à la commande, quels que soient les paliers configurés.
          </span>
        </span>
      </label>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-kraft-900">Paliers de livraison</h2>
          <button type="button" onClick={addTier} className="btn-secondary text-sm !py-1 !px-3">
            Ajouter un palier
          </button>
        </div>

        {tiers.length === 0 ? (
          <p className="text-sm text-kraft-600">
            Aucun palier configuré. Ajoutez-en un pour facturer la livraison.
          </p>
        ) : (
          <ul className="space-y-3">
            {tiers.map((t, idx) => (
              <li
                key={t.id}
                className="border border-kraft-200 rounded-md p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
              >
                <div>
                  <label className="label" htmlFor={`min-${t.id}`}>
                    Quantité min.
                  </label>
                  <input
                    id={`min-${t.id}`}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={t.minQuantity}
                    onChange={(e) => updateTier(t.id, { minQuantity: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`fee-${t.id}`}>
                    Frais (DT)
                  </label>
                  <input
                    id={`fee-${t.id}`}
                    type="number"
                    min={0}
                    step="0.001"
                    inputMode="decimal"
                    value={t.fee}
                    onChange={(e) => updateTier(t.id, { fee: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTier(t.id)}
                  className="text-sm text-red-600 hover:underline justify-self-end sm:justify-self-center"
                  aria-label={`Supprimer le palier ${idx + 1}`}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
