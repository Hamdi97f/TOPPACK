import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient, ApiError } from "./api-client";

/**
 * NextAuth is kept as the session/cookie layer; the credentials provider
 * delegates authentication to the api-gateway webapp's `POST /login`.
 *
 * The bearer token issued by `/login` is stashed in the JWT (`apiToken`) and
 * later replayed by server-side calls (admin proxies, account pages…) so that
 * we never need to ask the user for their password again.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        try {
          const res = await apiClient.login(email, credentials.password);
          return {
            id: res.user_id,
            email: res.email,
            name: res.email,
            role: res.is_admin ? "ADMIN" : "CUSTOMER",
            apiToken: res.token,
          };
        } catch (err) {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) return null;
          console.error("[auth] login failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; role: string; apiToken: string };
        token.id = u.id;
        token.role = u.role;
        token.apiToken = u.apiToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.apiToken = token.apiToken as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
