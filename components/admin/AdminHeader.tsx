"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AdminHeader({ user }: { user: { name: string; email: string } }) {
  return (
    <header className="bg-kraft-800 text-white">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/admin" className="font-bold text-lg">Espace Admin TOPPACK</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">Voir le site</Link>
          <span className="hidden sm:inline">{user.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="hover:underline">Déconnexion</button>
        </div>
      </div>
    </header>
  );
}
