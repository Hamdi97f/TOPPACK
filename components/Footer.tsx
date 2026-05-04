import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto bg-kraft-800 text-kraft-100">
      <div className="container-x py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-bold text-lg text-white mb-2">TOPPACK</div>
          <p className="text-kraft-200">
            Quality corrugated cardboard boxes for businesses of every size — single wall,
            double wall, mailer and custom printed packaging.
          </p>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Shop</div>
          <ul className="space-y-1">
            <li><Link href="/products" className="hover:text-white">All Products</Link></li>
            <li><Link href="/categories" className="hover:text-white">Categories</Link></li>
            <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Company</div>
          <ul className="space-y-1">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/shipping" className="hover:text-white">Shipping &amp; Returns</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white mb-2">Contact</div>
          <p className="text-kraft-200">support@toppack.local</p>
          <p className="text-kraft-200">+1 (555) 010-2030</p>
        </div>
      </div>
      <div className="border-t border-kraft-700 py-4 text-center text-xs text-kraft-300">
        © {new Date().getFullYear()} TOPPACK. All rights reserved.
      </div>
    </footer>
  );
}
