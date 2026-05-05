"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/orders", label: "Commandes" },
  { href: "/admin/products", label: "Produits" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/settings/checkout", label: "Commande" },
  { href: "/admin/settings/contact", label: "Contact" },
  { href: "/admin/settings/integrations", label: "Intégrations" },
  { href: "/admin/settings/account", label: "Comptes clients" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Sidebar shown only on tablet+. */
export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-white border-r border-kraft-200 p-4 hidden md:block">
      <nav className="space-y-1">
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                active ? "bg-kraft-700 text-white" : "text-kraft-800 hover:bg-kraft-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/**
 * Mobile-only top bar with hamburger that opens a slide-down drawer with the
 * same navigation as the desktop sidebar. Hidden at `md:` and up.
 */
export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const current = links.find((l) => isActive(pathname, l.href))?.label ?? "Menu";

  return (
    <div className="md:hidden bg-white border-b border-kraft-200 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 h-12">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          className="p-2 -ml-2 rounded-md hover:bg-kraft-100 text-kraft-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
        <div className="font-medium text-kraft-800 text-sm truncate">{current}</div>
        <span className="w-8" aria-hidden />
      </div>
      {open && (
        <>
          <div
            className="fixed inset-0 top-12 bg-black/40 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            id="admin-mobile-nav"
            className="absolute left-0 right-0 top-12 bg-white border-b border-kraft-200 shadow-lg z-20"
          >
            <ul>
              {links.map((l) => {
                const active = isActive(pathname, l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`block px-4 py-3 text-sm font-medium ${
                        active ? "bg-kraft-700 text-white" : "text-kraft-800 hover:bg-kraft-100"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
