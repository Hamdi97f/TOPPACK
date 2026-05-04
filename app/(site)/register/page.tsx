"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'inscription");
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) throw new Error("Compte créé. Veuillez vous connecter.");
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'inscription");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 max-w-md mx-auto mt-12 space-y-4">
      <h1 className="text-2xl font-bold text-kraft-900">Créer votre compte</h1>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe (8 caractères minimum)</label>
        <input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Création…" : "S'inscrire"}
      </button>
      <p className="text-sm text-kraft-700 text-center">
        Déjà un compte ? <Link href="/login" className="text-kraft-800 underline">Se connecter</Link>
      </p>
    </form>
  );
}
