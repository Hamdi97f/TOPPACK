"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "./CartProvider";

export function Header() {
  const { data: session } = useSession();
  const { count } = useCart();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="bg-white border-b border-kraft-200 sticky top-0 z-30">
      <div className="container-x flex items-center justify-between h-16 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-kraft-800">
          <span className="inline-block w-8 h-8 bg-kraft-700 text-white rounded grid place-items-center">📦</span>
          TOPPACK
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/products" className="hover:text-kraft-700">Boutique</Link>
          <Link href="/categories" className="hover:text-kraft-700">Catégories</Link>
          <Link href="/about" className="hover:text-kraft-700">À propos</Link>
          <Link href="/contact" className="hover:text-kraft-700">Contact</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/cart" className="relative px-2 py-1 hover:text-kraft-700" aria-label="Panier">
            🛒 Panier
            {count > 0 && (
              <span className="ml-1 inline-block bg-kraft-700 text-white rounded-full px-2 text-xs">
                {count}
              </span>
            )}
          </Link>
          {session ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="btn-secondary !py-1 !px-3 text-xs">Admin</Link>
              )}
              <Link href="/account" className="hover:text-kraft-700 hidden sm:inline">Mon compte</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="hover:text-kraft-700">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-kraft-700">Connexion</Link>
              <Link href="/register" className="btn-primary !py-1 !px-3 text-xs">S&apos;inscrire</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
