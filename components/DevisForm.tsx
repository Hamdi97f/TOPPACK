"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CANNELURE_TYPES,
  CARTON_COLORS,
  cartonColorLabel,
  FEFCO_MODELS,
  ONDULATION_OPTIONS,
  ondulationLabel,
  type Cannelure,
  type CartonColor,
  type FefcoModel,
  type Ondulation,
} from "@/lib/devis";
import {
  defaultDevisFormSettings,
  getDevisFieldConfig,
  type DevisFormSettings,
} from "@/lib/site-settings";

interface FormState {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company: string;
  model: FefcoModel;
  modelOther: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  ondulation: Ondulation;
  cannelure: Cannelure;
  color: CartonColor;
  printing: boolean;
  quantity: string;
  message: string;
}

function buildInitialState(settings: DevisFormSettings): FormState {
  return {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    company: "",
    model: FEFCO_MODELS[0],
    modelOther: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    ondulation: "simple",
    cannelure: "B",
    color: "marron",
    printing: false,
    quantity: String(Math.max(1, Math.floor(settings.minQuantity))),
    message: "",
  };
}

export function DevisForm({ settings }: { settings?: DevisFormSettings } = {}) {
  const effectiveSettings = settings ?? defaultDevisFormSettings();
  const minQuantity = Math.max(1, Math.floor(effectiveSettings.minQuantity));

  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...buildInitialState(effectiveSettings),
    quantity: String(minQuantity),
  }));
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoFileName, setLogoFileName] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = {
    customerName: getDevisFieldConfig(effectiveSettings, "customerName"),
    customerEmail: getDevisFieldConfig(effectiveSettings, "customerEmail"),
    customerPhone: getDevisFieldConfig(effectiveSettings, "customerPhone"),
    company: getDevisFieldConfig(effectiveSettings, "company"),
    ondulation: getDevisFieldConfig(effectiveSettings, "ondulation"),
    cannelure: getDevisFieldConfig(effectiveSettings, "cannelure"),
    color: getDevisFieldConfig(effectiveSettings, "color"),
    printing: getDevisFieldConfig(effectiveSettings, "printing"),
    message: getDevisFieldConfig(effectiveSettings, "message"),
  } as const;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadLogo(file: File) {
    setLogoError(null);
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/devis/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; name?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Échec du téléversement");
      }
      setLogoUrl(data.url);
      setLogoFileName(data.name || file.name);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Échec du téléversement");
    } finally {
      setLogoUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const printingActive = cfg.printing.visible && form.printing;
    if (printingActive && !logoUrl) {
      setError("Veuillez téléverser votre logo ou désactiver l'impression.");
      return;
    }
    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty < minQuantity) {
      setError(`La quantité minimale est de ${minQuantity}.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        lengthCm: Number(form.lengthCm),
        widthCm: Number(form.widthCm),
        heightCm: Number(form.heightCm),
        quantity: qty,
        printing: printingActive,
        logoUrl: printingActive ? logoUrl : "",
        logoFileName: printingActive ? logoFileName : "",
        modelOther: form.model === "Autre" ? form.modelOther : "",
      };
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { reference?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'envoi");
      }
      const ref = data.reference ?? "";
      router.push(`/devis/merci?ref=${encodeURIComponent(ref)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi");
      setSubmitting(false);
    }
  }

  // Hide the entire "Vos coordonnées" section if every identity field is hidden.
  const showContactSection =
    cfg.customerName.visible ||
    cfg.customerEmail.visible ||
    cfg.customerPhone.visible ||
    cfg.company.visible;

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {showContactSection && (
        <section className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-kraft-900">Vos coordonnées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cfg.customerName.visible && (
              <Field label="Nom complet" required={cfg.customerName.required}>
                <input
                  type="text"
                  autoComplete="name"
                  required={cfg.customerName.required}
                  className="input"
                  value={form.customerName}
                  onChange={(e) => update("customerName", e.target.value)}
                />
              </Field>
            )}
            {cfg.company.visible && (
              <Field label="Société" required={cfg.company.required}>
                <input
                  type="text"
                  autoComplete="organization"
                  required={cfg.company.required}
                  className="input"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                />
              </Field>
            )}
            {cfg.customerEmail.visible && (
              <Field label="E-mail" required={cfg.customerEmail.required}>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required={cfg.customerEmail.required}
                  className="input"
                  value={form.customerEmail}
                  onChange={(e) => update("customerEmail", e.target.value)}
                />
              </Field>
            )}
            {cfg.customerPhone.visible && (
              <Field label="Téléphone" required={cfg.customerPhone.required}>
                <input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  required={cfg.customerPhone.required}
                  className="input"
                  value={form.customerPhone}
                  onChange={(e) => update("customerPhone", e.target.value)}
                />
              </Field>
            )}
          </div>
        </section>
      )}

      <section className="card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-kraft-900">Caractéristiques du carton</h2>

        <Field label="Modèle FEFCO" required>
          <select
            className="select"
            value={form.model}
            onChange={(e) => update("model", e.target.value as FefcoModel)}
          >
            {FEFCO_MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        {form.model === "Autre" && (
          <Field label="Précisez le modèle" required>
            <input
              type="text"
              required
              className="input"
              value={form.modelOther}
              onChange={(e) => update("modelOther", e.target.value)}
              placeholder="Ex. FEFCO 0330, modèle sur mesure…"
            />
          </Field>
        )}

        <fieldset>
          <legend className="text-sm font-medium text-kraft-800 mb-2">
            Dimensions intérieures (cm) <span className="text-red-600">*</span>
          </legend>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Longueur">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                className="input"
                value={form.lengthCm}
                onChange={(e) => update("lengthCm", e.target.value)}
              />
            </Field>
            <Field label="Largeur">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                className="input"
                value={form.widthCm}
                onChange={(e) => update("widthCm", e.target.value)}
              />
            </Field>
            <Field label="Hauteur">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                className="input"
                value={form.heightCm}
                onChange={(e) => update("heightCm", e.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cfg.ondulation.visible && (
            <Field label="Type d'ondulation" required={cfg.ondulation.required}>
              <select
                className="select"
                value={form.ondulation}
                onChange={(e) => update("ondulation", e.target.value as Ondulation)}
              >
                {ONDULATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>{ondulationLabel(o)}</option>
                ))}
              </select>
            </Field>
          )}
          {cfg.cannelure.visible && (
            <Field label="Cannelure" required={cfg.cannelure.required}>
              <select
                className="select"
                value={form.cannelure}
                onChange={(e) => update("cannelure", e.target.value as Cannelure)}
              >
                {CANNELURE_TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          )}
          {cfg.color.visible && (
            <Field label="Couleur du carton" required={cfg.color.required}>
              <select
                className="select"
                value={form.color}
                onChange={(e) => update("color", e.target.value as CartonColor)}
              >
                {CARTON_COLORS.map((c) => (
                  <option key={c} value={c}>{cartonColorLabel(c)}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label={`Quantité (min. ${minQuantity})`} required>
            <input
              type="number"
              min={minQuantity}
              step="1"
              required
              className="input"
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
            />
          </Field>
        </div>
      </section>

      {cfg.printing.visible && (
        <section className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-kraft-900">Impression</h2>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.printing}
              onChange={(e) => update("printing", e.target.checked)}
            />
            <span>Je souhaite une impression sur le carton</span>
          </label>

          {form.printing && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-kraft-800">
                Logo à imprimer (JPG, PNG, WEBP ou GIF — 2 Mo max)
                <span className="text-red-600"> *</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={logoUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                }}
              />
              {logoUploading && (
                <p className="text-sm text-kraft-700">Téléversement en cours…</p>
              )}
              {logoError && (
                <p className="text-sm text-red-600">{logoError}</p>
              )}
              {logoUrl && !logoUploading && (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={logoFileName || "Logo"}
                    className="h-16 w-16 object-contain border border-kraft-200 rounded bg-white"
                  />
                  <span className="text-sm text-kraft-700 break-all">{logoFileName}</span>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {cfg.message.visible && (
        <section className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-kraft-900">Message complémentaire</h2>
          <Field label="Précisions éventuelles" required={cfg.message.required}>
            <textarea
              className="input min-h-[120px]"
              maxLength={2000}
              required={cfg.message.required}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              placeholder="Délais souhaités, contraintes particulières, références…"
            />
          </Field>
        </section>
      )}

      {error && (
        <div className="card p-4 border-red-300 bg-red-50 text-red-800">{error}</div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          className="btn-primary disabled:opacity-60"
          disabled={submitting || logoUploading}
        >
          {submitting ? "Envoi en cours…" : "Envoyer ma demande"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-kraft-800 mb-1">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}
