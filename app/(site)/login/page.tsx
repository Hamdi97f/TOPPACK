"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/account";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("E-mail ou mot de passe invalide");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 max-w-md mx-auto mt-12 space-y-4">
      <h1 className="text-2xl font-bold text-kraft-900">Connexion</h1>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Connexion en cours…" : "Se connecter"}
      </button>
      <p className="text-sm text-kraft-700 text-center">
        Pas encore de compte ? <Link href="/register" className="text-kraft-800 underline">S&apos;inscrire</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
