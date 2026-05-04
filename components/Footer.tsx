import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto bg-kraft-800 text-kraft-100">
      <div className="container-x py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-bold text-lg text-white mb-2">TOPPACK</div>
          <p className="text-kraft-200">
            Cartons en carton ondulé de qualité pour les entreprises de toutes tailles —
            simple cannelure, double cannelure, enveloppes d&apos;expédition et emballages
            personnalisés.
          </p>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Boutique</div>
          <ul className="space-y-1">
            <li><Link href="/products" className="hover:text-white">Tous les produits</Link></li>
            <li><Link href="/categories" className="hover:text-white">Catégories</Link></li>
            <li><Link href="/cart" className="hover:text-white">Panier</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Entreprise</div>
          <ul className="space-y-1">
            <li><Link href="/about" className="hover:text-white">À propos</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/shipping" className="hover:text-white">Livraison &amp; retours</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Contact</div>
          <p className="text-kraft-200">support@toppack.local</p>
          <p className="text-kraft-200">+1 (555) 010-2030</p>
        </div>
      </div>
      <div className="border-t border-kraft-700 py-4 text-center text-xs text-kraft-300">
        © {new Date().getFullYear()} TOPPACK. Tous droits réservés.
      </div>
    </footer>
  );
}
