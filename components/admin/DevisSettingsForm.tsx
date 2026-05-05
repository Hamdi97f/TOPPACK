"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import {
  DEVIS_FORM_FIELDS,
  type DevisFieldKey,
  type DevisFormSettings,
  devisFieldLabel,
} from "@/lib/site-settings";

type FieldState = Record<DevisFieldKey, { visible: boolean; required: boolean }>;

function toFieldState(settings: DevisFormSettings): FieldState {
  const state = {} as FieldState;
  for (const key of DEVIS_FORM_FIELDS) {
    const f = settings.fields.find((x) => x.field === key);
    state[key] = { visible: f?.visible ?? true, required: f?.required ?? false };
  }
  return state;
}

export function DevisSettingsForm({ initial }: { initial: DevisFormSettings }) {
  const router = useRouter();
  const [fields, setFields] = useState<FieldState>(() => toFieldState(initial));
  const [minQuantity, setMinQuantity] = useState<string>(String(initial.minQuantity));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setField(key: DevisFieldKey, patch: Partial<FieldState[DevisFieldKey]>) {
    setFields((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      if (!next[key].visible) next[key].required = false;
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const min = Math.floor(Number(minQuantity));
    if (!Number.isFinite(min) || min < 1) {
      setError("La quantité minimale doit être un entier supérieur ou égal à 1.");
      return;
    }

    setSaving(true);
    const payload: DevisFormSettings = {
      fields: DEVIS_FORM_FIELDS.map((field) => ({
        field,
        visible: fields[field].visible,
        required: fields[field].required,
      })),
      minQuantity: min,
    };
    try {
      const res = await fetch("/api/admin/settings/devis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await readJsonOrSignOut(res);
      setSuccess("Paramètres enregistrés.");
      setMinQuantity(String(min));
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

      <section>
        <h2 className="font-semibold text-kraft-900 mb-3">Champs du formulaire</h2>
        <p className="text-xs text-kraft-600 mb-3">
          Le modèle FEFCO, les dimensions et la quantité sont toujours affichés et obligatoires&nbsp;: ils sont
          indispensables pour établir un devis.
        </p>
        <div className="hidden md:grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 items-center text-sm">
          <div className="font-medium text-kraft-700">Champ</div>
          <div className="font-medium text-kraft-700 text-center">Visible</div>
          <div className="font-medium text-kraft-700 text-center">Obligatoire</div>
          {DEVIS_FORM_FIELDS.map((key) => (
            <FieldRow
              key={key}
              field={key}
              state={fields[key]}
              onChange={(patch) => setField(key, patch)}
            />
          ))}
        </div>
        <ul className="md:hidden space-y-3">
          {DEVIS_FORM_FIELDS.map((key) => (
            <li key={key} className="border-t border-kraft-100 pt-3 first:border-t-0 first:pt-0">
              <div className="font-medium text-kraft-900 mb-1">{devisFieldLabel(key)}</div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={fields[key].visible}
                    onChange={(e) => setField(key, { visible: e.target.checked })}
                  />
                  Visible
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={fields[key].required}
                    disabled={!fields[key].visible}
                    onChange={(e) => setField(key, { required: e.target.checked })}
                  />
                  Obligatoire
                </label>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-kraft-900 mb-3">Quantité minimale</h2>
        <p className="text-sm text-kraft-700 mb-2">
          Quantité minimale qu&apos;un client peut demander dans le formulaire de devis.
        </p>
        <label className="block max-w-xs">
          <span className="label">Quantité min.</span>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            className="input"
            value={minQuantity}
            onChange={(e) => setMinQuantity(e.target.value)}
            required
          />
        </label>
      </section>

      <div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function FieldRow({
  field,
  state,
  onChange,
}: {
  field: DevisFieldKey;
  state: { visible: boolean; required: boolean };
  onChange: (patch: { visible?: boolean; required?: boolean }) => void;
}) {
  return (
    <>
      <div className="text-kraft-900">{devisFieldLabel(field)}</div>
      <div className="text-center">
        <input
          type="checkbox"
          aria-label={`Afficher ${devisFieldLabel(field)}`}
          checked={state.visible}
          onChange={(e) => onChange({ visible: e.target.checked })}
        />
      </div>
      <div className="text-center">
        <input
          type="checkbox"
          aria-label={`Rendre ${devisFieldLabel(field)} obligatoire`}
          checked={state.required}
          disabled={!state.visible}
          onChange={(e) => onChange({ required: e.target.checked })}
        />
      </div>
    </>
  );
}
