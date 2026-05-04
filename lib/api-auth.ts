import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { ApiError } from "./api-client";

/**
 * Code attached to JSON error responses when the upstream api-gateway rejects
 * a forwarded admin/user call with 401 — typically because the bearer token
 * stashed in the NextAuth JWT has expired (the api-gateway issues short-lived
 * tokens but the NextAuth session lasts much longer). Browser-side callers
 * detect this code and sign the user out so they re-authenticate.
 */
export const SESSION_EXPIRED_CODE = "SESSION_EXPIRED";

const SESSION_EXPIRED_MESSAGE =
  "Votre session a expiré. Veuillez vous reconnecter pour continuer.";

function unauthorizedResponse() {
  return NextResponse.json(
    { error: SESSION_EXPIRED_MESSAGE, code: SESSION_EXPIRED_CODE },
    { status: 401 }
  );
}

/**
 * Shared admin guard for API route handlers.
 *
 * Returns either `{ response }` (a 401 NextResponse to be returned by the
 * handler) or `{ session }` (with the authenticated admin's NextAuth session,
 * which carries `apiToken` for forwarding to the api-gateway webapp).
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN" || !session.user.apiToken) {
    return { session: null, response: unauthorizedResponse() };
  }
  return { session, response: null };
}

/**
 * Variant for routes that any authenticated user may call (per-user data).
 */
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.apiToken) {
    return { session: null, response: unauthorizedResponse() };
  }
  return { session, response: null };
}

/**
 * Map an error caught from `apiClient.*` to a NextResponse. When the upstream
 * api-gateway returns 401 we tag the response with `code: SESSION_EXPIRED`
 * so the client can trigger a re-login flow instead of leaving the admin
 * stuck on a generic "Unauthorized" banner.
 */
export function apiErrorResponse(err: unknown, defaultMessage: string) {
  if (err instanceof ApiError) {
    if (err.status === 401) return unauthorizedResponse();
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : defaultMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}
