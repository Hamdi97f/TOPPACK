"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      customerPhone: formData.get("customerPhone"),
      addressLine: formData.get("addressLine"),
      city: formData.get("city"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country"),
      notes: formData.get("notes"),
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
      if (!res.ok) throw new Error(data.error || "Failed to place order");
      clear();
      router.push(`/orders/${data.id}/confirmation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
      setSubmitting(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="container-x py-8 grid lg:grid-cols-[1fr_22rem] gap-6">
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <h1 className="text-2xl font-bold text-kraft-900">Checkout</h1>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="customerName">Full Name</label>
            <input id="customerName" name="customerName" required defaultValue={session?.user?.name ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="customerEmail">Email</label>
            <input id="customerEmail" name="customerEmail" type="email" required defaultValue={session?.user?.email ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="customerPhone">Phone</label>
            <input id="customerPhone" name="customerPhone" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="country">Country</label>
            <input id="country" name="country" required defaultValue="United States" className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="addressLine">Address</label>
            <input id="addressLine" name="addressLine" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="postalCode">Postal Code</label>
            <input id="postalCode" name="postalCode" required className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="notes">Notes (optional)</label>
            <textarea id="notes" name="notes" rows={3} className="textarea" />
          </div>
        </div>

        <fieldset>
          <legend className="label">Payment Method</legend>
          <label className="flex items-center gap-2 p-3 card cursor-pointer mb-2">
            <input type="radio" name="paymentMethod" value="CASH_ON_DELIVERY" defaultChecked required />
            <span>Cash on Delivery</span>
          </label>
          <label className="flex items-center gap-2 p-3 card cursor-pointer">
            <input type="radio" name="paymentMethod" value="BANK_TRANSFER" required />
            <span>Bank Transfer</span>
          </label>
        </fieldset>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Placing order…" : `Place Order — ${formatPrice(subtotal)}`}
        </button>
      </form>

      <aside className="card p-6 h-fit">
        <h2 className="font-bold text-kraft-900 mb-3">Order Summary</h2>
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
