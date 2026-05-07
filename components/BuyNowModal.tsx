"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatPrice, paymentMethodLabel } from "@/lib/utils";
import {
  CheckoutFieldKey,
  CheckoutSettings,
  fieldLabel,
} from "@/lib/checkout-settings";
import {
  computeShippingFee,
  type ShippingSettings,
} from "@/lib/site-settings";

const FIELD_INPUT_PROPS: Record<
  CheckoutFieldKey,
  {
    type: string;
    autoComplete: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    isTextarea?: boolean;
  }
> = {
  customerName: { type: "text", autoComplete: "name" },
  customerEmail: { type: "email", autoComplete: "email", inputMode: "email" },
  customerPhone: { type: "tel", autoComplete: "tel", inputMode: "tel" },
  addressLine: { type: "text", autoComplete: "street-address" },
  city: { type: "text", autoComplete: "address-level2" },
  postalCode: { type: "text", autoComplete: "postal-code", inputMode: "numeric" },
  country: { type: "text", autoComplete: "country-name" },
  notes: { type: "text", autoComplete: "off", isTextarea: true },
};

export interface BuyNowProduct {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
}

/**
 * Mobile-friendly "Acheter maintenant" dialog.
 *
 * Lets the shopper pick a quantity for a single product and fill in the
 * checkout form in one step, then submits directly to `/api/orders` without
 * touching the persistent cart. The visible/required fields and payment
 * methods come from the same `CheckoutSettings` schema used by the regular
 * checkout page so admin overrides apply consistently.
 */
export function BuyNowModal({
  open,
  onClose,
  product,
  checkoutSettings,
  shipping,
  requireAccount,
}: {
  open: boolean;
  onClose: () => void;
  product: BuyNowProduct;
  checkoutSettings: CheckoutSettings;
  shipping: ShippingSettings;
  requireAccount: boolean;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Reset transient state every time the modal opens so a previous error or
  // quantity choice doesn't bleed into the next purchase.
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setError(null);
      setSubmitting(false);
    }
  }, [open, product.productId]);

  // Lock background scroll, focus the close button, and close on Escape so
  // the dialog behaves like a real modal on mobile and desktop.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const fieldsByKey = new Map(checkoutSettings.fields.map((f) => [f.field, f]));
  const visibleFields = (Object.keys(FIELD_INPUT_PROPS) as CheckoutFieldKey[]).filter(
    (k) => fieldsByKey.get(k)?.visible !== false
  );
  const isRequired = (k: CheckoutFieldKey) => fieldsByKey.get(k)?.required === true;
  const isVisible = (k: CheckoutFieldKey) => fieldsByKey.get(k)?.visible !== false;

  function defaultValueFor(k: CheckoutFieldKey): string {
    if (k === "customerName") return session?.user?.name ?? "";
    if (k === "customerEmail") return session?.user?.email ?? "";
    if (k === "country") return "France";
    return "";
  }

  const subtotal = product.price * quantity;
  const shippingFee = computeShippingFee(quantity, shipping);
  const grandTotal = subtotal + shippingFee;

  const needsLogin = requireAccount && status === "unauthenticated";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (needsLogin) {
      router.push("/login?callbackUrl=%2Fcheckout");
      return;
    }
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const get = (k: CheckoutFieldKey) => (isVisible(k) ? (formData.get(k) ?? "") : "");
    const payload = {
      customerName: get("customerName"),
      customerEmail: get("customerEmail"),
      customerPhone: get("customerPhone"),
      addressLine: get("addressLine"),
      city: get("city"),
      postalCode: get("postalCode"),
      country: get("country"),
      notes: get("notes"),
      paymentMethod: formData.get("paymentMethod"),
      items: [{ productId: product.productId, quantity }],
    };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "ACCOUNT_REQUIRED") {
          router.push("/login?callbackUrl=%2Fcheckout");
          return;
        }
        throw new Error(data.error || "Échec de la commande");
      }
      router.push(`/orders/${data.id}/confirmation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la commande");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-now-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-kraft-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="w-12 h-12 bg-kraft-100 rounded grid place-items-center text-2xl shrink-0 overflow-hidden">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              "📦"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="buy-now-title" className="font-bold text-kraft-900 line-clamp-2">
              {product.name}
            </h2>
            <div className="text-sm text-kraft-700 mt-0.5">{formatPrice(product.price)}</div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-kraft-700 hover:bg-kraft-100 rounded-md p-2 -m-1 shrink-0"
            aria-label="Fermer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

          {/* Quantity */}
          <div>
            <label className="label" htmlFor="buy-now-quantity">
              Quantité
            </label>
            <div
              className="inline-flex items-center border border-kraft-200 rounded-md overflow-hidden"
              role="group"
              aria-label="Sélecteur de quantité"
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-11 h-11 grid place-items-center text-lg font-bold text-kraft-800 hover:bg-kraft-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Diminuer la quantité"
              >
                −
              </button>
              <input
                id="buy-now-quantity"
                type="number"
                min={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 h-11 text-center border-x border-kraft-200 focus:outline-none focus:ring-2 focus:ring-kraft-500"
                aria-label="Quantité"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-11 h-11 grid place-items-center text-lg font-bold text-kraft-800 hover:bg-kraft-100"
                aria-label="Augmenter la quantité"
              >
                +
              </button>
            </div>
          </div>

          {needsLogin ? (
            <div className="bg-kraft-50 border border-kraft-200 rounded-md p-3 text-sm text-kraft-800">
              Un compte est requis pour finaliser votre commande. Vous serez
              redirigé vers la page de connexion.
            </div>
          ) : (
            <>
              {/* Checkout fields */}
              <div className="grid sm:grid-cols-2 gap-3">
                {visibleFields.map((k) => {
                  const props = FIELD_INPUT_PROPS[k];
                  const required = isRequired(k);
                  const fullWidth = k === "addressLine" || k === "notes";
                  return (
                    <div key={k} className={fullWidth ? "sm:col-span-2" : undefined}>
                      <label className="label" htmlFor={`buy-now-${k}`}>
                        {fieldLabel(k)}
                        {required ? "" : " (facultatif)"}
                      </label>
                      {props.isTextarea ? (
                        <textarea
                          id={`buy-now-${k}`}
                          name={k}
                          rows={3}
                          required={required}
                          autoComplete={props.autoComplete}
                          className="textarea"
                        />
                      ) : (
                        <input
                          id={`buy-now-${k}`}
                          name={k}
                          type={props.type}
                          required={required}
                          defaultValue={defaultValueFor(k)}
                          autoComplete={props.autoComplete}
                          inputMode={props.inputMode}
                          className="input"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {checkoutSettings.paymentMethods.length > 0 && (
                <fieldset>
                  <legend className="label">Mode de paiement</legend>
                  {checkoutSettings.paymentMethods.map((m, idx) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 p-3 card cursor-pointer mb-2 last:mb-0"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={m}
                        defaultChecked={idx === 0}
                        required
                      />
                      <span>{paymentMethodLabel(m)}</span>
                    </label>
                  ))}
                </fieldset>
              )}
            </>
          )}

          {/* Summary */}
          <div className="border-t border-kraft-200 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-kraft-700">
              <span>Livraison</span>
              {shipping.enabled && shipping.tiers.length > 0 ? (
                <span>{formatPrice(shippingFee)}</span>
              ) : (
                <span>Calculée à la commande</span>
              )}
            </div>
            <div className="flex justify-between font-bold text-kraft-900 text-base pt-1">
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* Submit (sticky footer on mobile via padding only — relies on body scroll) */}
          <button
            type="submit"
            className="btn w-full bg-green-600 text-white hover:bg-green-700"
            disabled={submitting}
          >
            {submitting
              ? "Traitement de la commande…"
              : needsLogin
              ? "Se connecter pour commander"
              : `Valider la commande — ${formatPrice(grandTotal)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
