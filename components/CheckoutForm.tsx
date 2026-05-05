"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/CartProvider";
import { formatPrice, paymentMethodLabel } from "@/lib/utils";
import {
  CheckoutFieldKey,
  CheckoutSettings,
  fieldLabel,
} from "@/lib/checkout-settings";

const FIELD_INPUT_PROPS: Record<
  CheckoutFieldKey,
  {
    type: string;
    autoComplete: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    isTextarea?: boolean;
    placeholder?: string;
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

export function CheckoutForm({ settings }: { settings: CheckoutSettings }) {
  const { items, subtotal, clear } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items, router]);

  // Pre-compute the visible fields in the schema-defined order so the layout
  // is stable regardless of how the admin saved them.
  const fieldsByKey = new Map(settings.fields.map((f) => [f.field, f]));
  const visibleFields = (Object.keys(FIELD_INPUT_PROPS) as CheckoutFieldKey[]).filter(
    (k) => fieldsByKey.get(k)?.visible !== false
  );
  const isRequired = (k: CheckoutFieldKey) => fieldsByKey.get(k)?.required === true;
  const isVisible = (k: CheckoutFieldKey) => fieldsByKey.get(k)?.visible !== false;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la commande");
      clear();
      router.push(`/orders/${data.id}/confirmation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la commande");
      setSubmitting(false);
    }
  }

  if (items.length === 0) return null;

  function defaultValueFor(k: CheckoutFieldKey): string {
    if (k === "customerName") return session?.user?.name ?? "";
    if (k === "customerEmail") return session?.user?.email ?? "";
    if (k === "country") return "France";
    return "";
  }

  return (
    <div className="container-x py-8 grid lg:grid-cols-[1fr_22rem] gap-6">
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-kraft-900">Commande</h1>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

        <div className="grid md:grid-cols-2 gap-4">
          {visibleFields.map((k) => {
            const props = FIELD_INPUT_PROPS[k];
            const required = isRequired(k);
            const fullWidth = k === "addressLine" || k === "notes";
            return (
              <div key={k} className={fullWidth ? "md:col-span-2" : undefined}>
                <label className="label" htmlFor={k}>
                  {fieldLabel(k)}{required ? "" : " (facultatif)"}
                </label>
                {props.isTextarea ? (
                  <textarea
                    id={k}
                    name={k}
                    rows={3}
                    required={required}
                    autoComplete={props.autoComplete}
                    className="textarea"
                  />
                ) : (
                  <input
                    id={k}
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

        {settings.paymentMethods.length > 0 && (
          <fieldset>
            <legend className="label">Mode de paiement</legend>
            {settings.paymentMethods.map((m, idx) => (
              <label key={m} className="flex items-center gap-2 p-3 card cursor-pointer mb-2 last:mb-0">
                <input type="radio" name="paymentMethod" value={m} defaultChecked={idx === 0} required />
                <span>{paymentMethodLabel(m)}</span>
              </label>
            ))}
          </fieldset>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Traitement de la commande…" : `Valider la commande — ${formatPrice(subtotal)}`}
        </button>
      </form>

      <aside className="card p-6 h-fit">
        <h2 className="font-bold text-kraft-900 mb-3">Récapitulatif</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between">
              <span className="truncate pr-2">{i.name} × {i.quantity}</span>
              <span>{formatPrice(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-kraft-200 mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
      </aside>
    </div>
  );
}
