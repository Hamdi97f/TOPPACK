"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import {
  CHAT_QA_COUNT,
  type ChatQAPair,
  type ChatSettings,
} from "@/lib/site-settings";

export function ChatSettingsForm({ initial }: { initial: ChatSettings }) {
  const router = useRouter();
  const [data, setData] = useState<ChatSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function setQa(index: number, patch: Partial<ChatQAPair>) {
    setData((prev) => {
      const qa = prev.qa.slice();
      qa[index] = { ...qa[index], ...patch };
      return { ...prev, qa };
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const saved = await readJsonOrSignOut<{ chat: ChatSettings }>(res);
      if (saved?.chat) setData(saved.chat);
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
          <h2 className="font-semibold text-kraft-900">Activation du chat</h2>
          <p className="text-sm text-kraft-700">
            Lorsque cette option est activée, une petite fenêtre de
            discussion apparaît en bas à droite de toutes les pages du site
            public.
          </p>
        </header>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          <span className="text-sm text-kraft-800">
            Afficher le chat en direct sur le site
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.botMode}
            onChange={(e) => set("botMode", e.target.checked)}
            disabled={!data.enabled}
          />
          <span className="text-sm text-kraft-800">
            Mode bot : répondre automatiquement aux questions du visiteur
          </span>
        </label>
        <p className="text-xs text-kraft-600">
          Si le mode bot est désactivé, les messages reçoivent un simple
          accusé de réception (« Notre équipe vous répondra dès que
          possible. »).
        </p>
      </section>

      <section className="space-y-3 border-t border-kraft-200 pt-6">
        <header>
          <h2 className="font-semibold text-kraft-900">Message d&apos;accueil</h2>
          <p className="text-sm text-kraft-700">
            Premier message affiché lorsque le visiteur ouvre le chat.
          </p>
        </header>
        <textarea
          rows={2}
          maxLength={280}
          value={data.welcomeMessage}
          onChange={(e) => set("welcomeMessage", e.target.value)}
          className="textarea"
        />
      </section>

      <section className="space-y-3 border-t border-kraft-200 pt-6">
        <header>
          <h2 className="font-semibold text-kraft-900">
            Questions et réponses du bot
          </h2>
          <p className="text-sm text-kraft-700">
            Ces {CHAT_QA_COUNT} questions sont proposées au visiteur sous
            forme de boutons rapides. Le bot utilise également les mots-clés
            de chaque question pour reconnaître les messages libres et y
            répondre automatiquement.
          </p>
        </header>
        <div className="space-y-4">
          {data.qa.map((pair, i) => (
            <div key={i} className="rounded-md border border-kraft-200 p-3 space-y-2">
              <div>
                <label className="label" htmlFor={`q-${i}`}>
                  Question {i + 1}
                </label>
                <input
                  id={`q-${i}`}
                  type="text"
                  maxLength={200}
                  value={pair.question}
                  onChange={(e) => setQa(i, { question: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor={`a-${i}`}>
                  Réponse {i + 1}
                </label>
                <textarea
                  id={`a-${i}`}
                  rows={3}
                  maxLength={600}
                  value={pair.answer}
                  onChange={(e) => setQa(i, { answer: e.target.value })}
                  className="textarea"
                />
              </div>
            </div>
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
