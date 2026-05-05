"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import type { ContactInfo } from "@/lib/site-settings";

export function ContactInfoForm({ initial }: { initial: ContactInfo }) {
  const router = useRouter();
  const [data, setData] = useState<ContactInfo>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ContactInfo>(key: K, value: ContactInfo[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await readJsonOrSignOut(res);
      setSuccess("Informations enregistrées.");
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
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input
            id="email" type="email" autoComplete="email" inputMode="email"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">Téléphone</label>
          <input
            id="phone" type="tel" autoComplete="tel" inputMode="tel"
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="input"
          />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="address">Adresse</label>
          <textarea
            id="address" rows={2}
            value={data.address}
            onChange={(e) => set("address", e.target.value)}
            className="textarea"
          />
        </div>
        <div>
          <label className="label" htmlFor="hours">Horaires</label>
          <input
            id="hours" type="text"
            value={data.hours}
            onChange={(e) => set("hours", e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="mapUrl">Lien Google Maps (facultatif)</label>
          <input
            id="mapUrl" type="url" inputMode="url"
            placeholder="https://maps.google.com/?q=…"
            value={data.mapUrl}
            onChange={(e) => set("mapUrl", e.target.value)}
            className="input"
          />
        </div>
      </div>
      <div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
