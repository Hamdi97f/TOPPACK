"use client";

import { signOut } from "next-auth/react";

/**
 * Browser-side wrapper for fetch responses returned by our internal admin/
 * account API routes. When the upstream api-gateway rejects the forwarded
 * call with 401 (typically because the bearer token stashed in the NextAuth
 * JWT has expired), the route returns `{ code: "SESSION_EXPIRED" }`.
 *
 * In that case we sign the user out and bounce them through the login page
 * so they can refresh their token, instead of leaving them on a "Unauthorized"
 * banner with no way to recover.
 *
 * Returns the parsed JSON body. Throws an Error with a friendly French
 * message on non-OK responses (other than SESSION_EXPIRED, which redirects).
 */
export async function readJsonOrSignOut<T = unknown>(res: Response): Promise<T> {
  let data: { error?: string; code?: string } & Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (res.status === 401 && data?.code === "SESSION_EXPIRED") {
    const callbackUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/admin";
    await signOut({
      callbackUrl: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    });
    // signOut triggers a full navigation; throw so the caller stops further
    // work in the meantime.
    throw new Error(
      data?.error ||
        "Votre session a expiré. Veuillez vous reconnecter pour continuer."
    );
  }

  if (!res.ok) {
    throw new Error(data?.error || "Échec de la requête");
  }

  return data as T;
}
