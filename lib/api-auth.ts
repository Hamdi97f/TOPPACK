import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

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
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, response: null };
}

/**
 * Variant for routes that any authenticated user may call (per-user data).
 */
export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.apiToken) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, response: null };
}
