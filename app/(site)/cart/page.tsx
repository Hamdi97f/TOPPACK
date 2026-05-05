"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { items, setQuantity, remove, subtotal, clear } = useCart();
  const { status } = useSession();
  const [requireAccount, setRequireAccount] = useState(false);

  // Show a hint on the cart when the admin requires customers to sign in
  // before checkout. Pulled lazily so the cart still works if the call fails.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-settings/public", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.requireAccountForOrder) setRequireAccount(true);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  const needsLogin = requireAccount && status === "unauthenticated";

  if (items.length === 0) {
    return (
      <div className="container-x py-16 text-center">
        <h1 className="text-2xl font-bold text-kraft-900">Votre panier est vide</h1>
        <p className="text-kraft-700 mt-2">Parcourez nos cartons et ajoutez un article à votre panier.</p>
        <Link href="/products" className="btn-primary mt-6 inline-flex">Acheter maintenant</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-8 grid lg:grid-cols-[1fr_22rem] gap-6">
      <section>
        <h1 className="text-2xl font-bold text-kraft-900 mb-4">Votre panier</h1>
        <div className="card divide-y divide-kraft-100">
          {items.map((i) => (
            <div key={i.productId} className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-kraft-100 rounded grid place-items-center text-2xl shrink-0">
                {i.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover rounded" />
                ) : "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${i.slug}`} className="font-medium text-kraft-900 hover:text-kraft-700 truncate block">
                  {i.name}
                </Link>
                <div className="text-sm text-kraft-700">{formatPrice(i.price)}</div>
              </div>
              <input
                type="number"
                min={1}
                value={i.quantity}
                onChange={(e) => setQuantity(i.productId, Number(e.target.value) || 1)}
                className="input w-20"
                aria-label={`Quantité pour ${i.name}`}
              />
              <div className="w-24 text-right font-semibold">{formatPrice(i.price * i.quantity)}</div>
              <button onClick={() => remove(i.productId)} className="text-red-600 hover:underline text-sm">
                Retirer
              </button>
            </div>
          ))}
        </div>
        <button onClick={clear} className="mt-3 text-sm text-kraft-600 hover:underline">Vider le panier</button>
      </section>
      <aside className="card p-6 h-fit sticky top-20">
        <div className="flex justify-between text-sm">
          <span>Sous-total</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1 text-kraft-600">
          <span>Livraison</span>
          <span>Calculée à la commande</span>
        </div>
        <div className="border-t border-kraft-200 my-4" />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <Link
          href={needsLogin ? "/login?callbackUrl=%2Fcheckout" : "/checkout"}
          className="btn-primary w-full mt-4"
        >
          {needsLogin ? "Se connecter pour commander" : "Passer à la commande"}
        </Link>
        {needsLogin && (
          <p className="text-xs text-kraft-700 mt-2 text-center">
            Un compte est requis pour finaliser votre commande.
          </p>
        )}
        <Link href="/products" className="block text-center mt-2 text-sm text-kraft-700 hover:underline">
          Continuer mes achats
        </Link>
      </aside>
    </div>
  );
}
