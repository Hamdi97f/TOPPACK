"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CHECKOUT_FIELDS,
  CheckoutFieldKey,
  CheckoutSettings,
  fieldLabel,
} from "@/lib/checkout-settings";
import { PAYMENT_METHODS, paymentMethodLabel, type PaymentMethod } from "@/lib/utils";
import { readJsonOrSignOut } from "@/lib/client-fetch";

type FieldState = Record<CheckoutFieldKey, { visible: boolean; required: boolean }>;

function toFieldState(settings: CheckoutSettings): FieldState {
  const state = {} as FieldState;
  for (const key of CHECKOUT_FIELDS) {
    const f = settings.fields.find((x) => x.field === key);
    state[key] = { visible: f?.visible ?? true, required: f?.required ?? false };
  }
  return state;
}

export function CheckoutSettingsForm({ initial }: { initial: CheckoutSettings }) {
  const router = useRouter();
  const [fields, setFields] = useState<FieldState>(() => toFieldState(initial));
  const [methods, setMethods] = useState<Set<PaymentMethod>>(
    () => new Set(initial.paymentMethods)
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setField(key: CheckoutFieldKey, patch: Partial<FieldState[CheckoutFieldKey]>) {
    setFields((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      // A hidden field cannot be required — keep state coherent so the saved
      // shape is always sensible.
      if (!next[key].visible) next[key].required = false;
      return next;
    });
  }

  function toggleMethod(m: PaymentMethod) {
    setMethods((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (methods.size === 0) {
      setError("Au moins un mode de paiement doit être activé.");
      return;
    }
    setSaving(true);
    const payload: CheckoutSettings = {
      fields: CHECKOUT_FIELDS.map((field) => ({
        field,
        visible: fields[field].visible,
        required: fields[field].required,
      })),
      paymentMethods: PAYMENT_METHODS.filter((m) => methods.has(m)),
    };
    try {
      const res = await fetch("/api/admin/settings/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      <section>
        <h2 className="font-semibold text-kraft-900 mb-3">Champs du formulaire</h2>
        <div className="hidden md:grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 items-center text-sm">
          <div className="font-medium text-kraft-700">Champ</div>
          <div className="font-medium text-kraft-700 text-center">Visible</div>
          <div className="font-medium text-kraft-700 text-center">Obligatoire</div>
          {CHECKOUT_FIELDS.map((key) => (
            <FieldRow
              key={key}
              field={key}
              state={fields[key]}
              onChange={(patch) => setField(key, patch)}
            />
          ))}
        </div>
        <ul className="md:hidden space-y-3">
          {CHECKOUT_FIELDS.map((key) => (
            <li key={key} className="border-t border-kraft-100 pt-3 first:border-t-0 first:pt-0">
              <div className="font-medium text-kraft-900 mb-1">{fieldLabel(key)}</div>
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
        <h2 className="font-semibold text-kraft-900 mb-3">Modes de paiement</h2>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={methods.has(m)}
                onChange={() => toggleMethod(m)}
              />
              {paymentMethodLabel(m)}
            </label>
          ))}
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

function FieldRow({
  field,
  state,
  onChange,
}: {
  field: CheckoutFieldKey;
  state: { visible: boolean; required: boolean };
  onChange: (patch: { visible?: boolean; required?: boolean }) => void;
}) {
  return (
    <>
      <div className="text-kraft-900">{fieldLabel(field)}</div>
      <div className="text-center">
        <input
          type="checkbox"
          aria-label={`Afficher ${fieldLabel(field)}`}
          checked={state.visible}
          onChange={(e) => onChange({ visible: e.target.checked })}
        />
      </div>
      <div className="text-center">
        <input
          type="checkbox"
          aria-label={`Rendre ${fieldLabel(field)} obligatoire`}
          checked={state.required}
          disabled={!state.visible}
          onChange={(e) => onChange({ required: e.target.checked })}
        />
      </div>
    </>
  );
}
