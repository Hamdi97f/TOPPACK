"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/utils";
import {
  computeShippingFee,
  defaultShippingSettings,
  normaliseShippingSettings,
  type ShippingSettings,
} from "@/lib/site-settings";

export default function CartPage() {
  const { items, setQuantity, remove, subtotal, count, clear } = useCart();
  const { status } = useSession();
  const [requireAccount, setRequireAccount] = useState(false);
  const [shipping, setShipping] = useState<ShippingSettings>(() => defaultShippingSettings());

  // Pull the public site settings lazily so the cart still works if the call
  // fails. Both `requireAccountForOrder` and the shipping configuration are
  // exposed by /api/site-settings/public (no secrets leak).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-settings/public", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.requireAccountForOrder) setRequireAccount(true);
        if (data.shipping) setShipping(normaliseShippingSettings(data.shipping));
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  const needsLogin = requireAccount && status === "unauthenticated";
  const shippingFee = computeShippingFee(count, shipping);
  const total = subtotal + shippingFee;

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
    <div className="container-x py-6 sm:py-8 grid lg:grid-cols-[1fr_22rem] gap-6">
      <section>
        <h1 className="text-xl sm:text-2xl font-bold text-kraft-900 mb-4">Votre panier</h1>
        <ul className="card divide-y divide-kraft-100">
          {items.map((i) => {
            const lineTotal = i.price * i.quantity;
            return (
              <li key={i.productId} className="p-3 sm:p-4">
                {/* Mobile-first stacked layout. The desktop variant is recovered
                    via a wider product cell — quantity / total / actions stay
                    on a second row so touch targets remain comfortable. */}
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-kraft-100 rounded grid place-items-center text-2xl shrink-0">
                    {i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover rounded" />
                    ) : "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${i.slug}`}
                      className="font-medium text-kraft-900 hover:text-kraft-700 line-clamp-2 block"
                    >
                      {i.name}
                    </Link>
                    <div className="text-sm text-kraft-700 mt-0.5">{formatPrice(i.price)}</div>
                  </div>
                  <button
                    onClick={() => remove(i.productId)}
                    className="text-red-600 hover:bg-red-50 rounded-md p-2 -m-2 shrink-0"
                    aria-label={`Retirer ${i.name}`}
                    title="Retirer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div
                    className="inline-flex items-center border border-kraft-200 rounded-md overflow-hidden"
                    role="group"
                    aria-label={`Quantité pour ${i.name}`}
                  >
                    <button
                      type="button"
                      onClick={() => setQuantity(i.productId, i.quantity - 1)}
                      disabled={i.quantity <= 1}
                      className="w-10 h-10 grid place-items-center text-lg font-bold text-kraft-800 hover:bg-kraft-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Diminuer la quantité"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={i.quantity}
                      onChange={(e) => setQuantity(i.productId, Number(e.target.value) || 1)}
                      className="w-12 h-10 text-center border-x border-kraft-200 focus:outline-none focus:ring-2 focus:ring-kraft-500"
                      aria-label={`Quantité pour ${i.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(i.productId, i.quantity + 1)}
                      className="w-10 h-10 grid place-items-center text-lg font-bold text-kraft-800 hover:bg-kraft-100"
                      aria-label="Augmenter la quantité"
                    >
                      +
                    </button>
                  </div>
                  <div className="font-semibold text-kraft-900 text-right">
                    {formatPrice(lineTotal)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <button onClick={clear} className="mt-3 text-sm text-kraft-600 hover:underline">Vider le panier</button>
      </section>
      <aside className="card p-4 sm:p-6 h-fit lg:sticky lg:top-20">
        <div className="flex justify-between text-sm">
          <span>Sous-total ({count} {count > 1 ? "articles" : "article"})</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1 text-kraft-700">
          <span>Livraison</span>
          {shipping.enabled && shipping.tiers.length > 0 ? (
            <span className="font-semibold">{formatPrice(shippingFee)}</span>
          ) : (
            <span>Calculée à la commande</span>
          )}
        </div>
        <div className="border-t border-kraft-200 my-4" />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
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
