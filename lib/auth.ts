import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

/**
 * Constant-time string comparison to avoid timing attacks when
 * comparing plain-text credentials from environment variables.
 */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

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

        // 1) Environment-based admin fallback.
        //    If ADMIN_EMAIL and ADMIN_PASSWORD are configured (e.g. as Netlify
        //    environment variables), allow that account to sign in as ADMIN
        //    without requiring a seeded database. This makes the admin usable
        //    on a fresh deployment and survives even if the database is
        //    temporarily unreachable.
        const envEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const envPassword = process.env.ADMIN_PASSWORD;
        if (envEmail && envPassword && safeEqual(email, envEmail) && safeEqual(credentials.password, envPassword)) {
          return {
            id: "env-admin",
            name: process.env.ADMIN_NAME || "TOPPACK Admin",
            email: envEmail,
            role: "ADMIN",
          };
        }

        // 2) Database-backed users (customers and any DB-stored admins).
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.isActive) return null;
          const ok = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!ok) return null;
          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (err) {
          // Database unavailable or misconfigured — log and deny rather than
          // surfacing a 500 from NextAuth. The env-admin path above still works.
          console.error("[auth] database lookup failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
