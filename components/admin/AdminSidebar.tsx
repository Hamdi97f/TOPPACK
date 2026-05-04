"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/orders", label: "Commandes" },
  { href: "/admin/products", label: "Produits" },
  { href: "/admin/categories", label: "Catégories" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-white border-r border-kraft-200 p-4 hidden md:block">
      <nav className="space-y-1">
        {links.map((l) => {
          const active =
            l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
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
