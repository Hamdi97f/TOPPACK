"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCart } from "./CartProvider";

export function Header() {
  const { data: session } = useSession();
  const { count } = useCart();
  const isAdmin = session?.user?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close the drawer on navigation. Otherwise the menu stays open after
  // tapping a link on mobile, hiding the page underneath.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent background scrolling while the drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
          <Link href="/devis" className="hover:text-kraft-700">Devis</Link>
          <Link href="/about" className="hover:text-kraft-700">À propos</Link>
          <Link href="/contact" className="hover:text-kraft-700">Contact</Link>
        </nav>
        <div className="hidden md:flex items-center gap-3 text-sm">
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
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/cart" className="relative px-2 py-2 hover:text-kraft-700" aria-label="Panier">
            <span aria-hidden>🛒</span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-kraft-700 text-white rounded-full px-1.5 text-[10px] leading-tight">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-md hover:bg-kraft-100 text-kraft-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 bg-black/40 z-20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            id="mobile-nav"
            className="md:hidden fixed inset-x-0 top-16 bg-white border-b border-kraft-200 shadow-lg z-30 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <ul className="py-2 text-base font-medium">
              <li><Link href="/products" className="block px-4 py-3 hover:bg-kraft-50">Boutique</Link></li>
              <li><Link href="/categories" className="block px-4 py-3 hover:bg-kraft-50">Catégories</Link></li>
              <li><Link href="/devis" className="block px-4 py-3 hover:bg-kraft-50">Devis</Link></li>
              <li><Link href="/about" className="block px-4 py-3 hover:bg-kraft-50">À propos</Link></li>
              <li><Link href="/contact" className="block px-4 py-3 hover:bg-kraft-50">Contact</Link></li>
              <li><Link href="/cart" className="block px-4 py-3 hover:bg-kraft-50">Panier ({count})</Link></li>
              {session ? (
                <>
                  {isAdmin && <li><Link href="/admin" className="block px-4 py-3 hover:bg-kraft-50">Admin</Link></li>}
                  <li><Link href="/account" className="block px-4 py-3 hover:bg-kraft-50">Mon compte</Link></li>
                  <li>
                    <button
                      onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                      className="block w-full text-left px-4 py-3 hover:bg-kraft-50"
                    >
                      Déconnexion
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li><Link href="/login" className="block px-4 py-3 hover:bg-kraft-50">Connexion</Link></li>
                  <li><Link href="/register" className="block px-4 py-3 hover:bg-kraft-50">S&apos;inscrire</Link></li>
                </>
              )}
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
