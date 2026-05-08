"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import {
  formatPrice,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  paymentMethodLabel,
  statusLabel,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/utils";
import { TUNISIA_GOVERNORATES } from "@/lib/tunisia-governorates";

export type ManualOrderProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
};

type LineItem = {
  productId: string;
  quantity: number;
};

export function ManualOrderForm({ products }: { products: ManualOrderProduct[] }) {
  const router = useRouter();
  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products]
  );

  const [items, setItems] = useState<LineItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH_ON_DELIVERY");
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [productPick, setProductPick] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () =>
      items.reduce((sum, li) => {
        const p = productById.get(li.productId);
        return sum + (p ? Number(p.price) * li.quantity : 0);
      }, 0),
    [items, productById]
  );

  function addProduct() {
    if (!productPick) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productPick);
      if (existing) {
        return prev.map((i) =>
          i.productId === productPick ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId: productPick, quantity: 1 }];
    });
    setProductPick("");
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, Math.floor(qty || 1)) } : i
      )
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError("Ajoutez au moins un produit à la commande.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        notes: notes.trim(),
        paymentMethod,
        status,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      };
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonOrSignOut<{ order: { id: string } }>(res);
      router.push(`/admin/orders/${data.order.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la création");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>
      )}

      <section className="card p-4 sm:p-6 space-y-3">
        <h2 className="font-semibold text-kraft-900">Articles</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            className="select flex-1"
            value={productPick}
            onChange={(e) => setProductPick(e.target.value)}
          >
            <option value="">— Sélectionner un produit —</option>
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.sku ? ` (${p.sku})` : ""} — {formatPrice(Number(p.price))}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary"
            onClick={addProduct}
            disabled={!productPick}
          >
            Ajouter
          </button>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-kraft-100 text-kraft-800">
                <tr>
                  <th className="text-left p-2">Produit</th>
                  <th className="text-right p-2 w-24">Qté</th>
                  <th className="text-right p-2">Unité</th>
                  <th className="text-right p-2">Total</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((li) => {
                  const p = productById.get(li.productId);
                  const unit = p ? Number(p.price) : 0;
                  return (
                    <tr key={li.productId} className="border-t border-kraft-100">
                      <td className="p-2">{p?.name ?? li.productId}</td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={li.quantity}
                          onChange={(e) => updateQty(li.productId, Number(e.target.value))}
                          className="input !py-1 !px-2 text-right w-20"
                        />
                      </td>
                      <td className="p-2 text-right">{formatPrice(unit)}</td>
                      <td className="p-2 text-right">{formatPrice(unit * li.quantity)}</td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(li.productId)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold border-t border-kraft-200">
                  <td colSpan={3} className="p-2 text-right">Total estimé</td>
                  <td className="p-2 text-right">{formatPrice(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <p className="text-xs text-kraft-600 mt-1">
              Le total est recalculé côté serveur d&apos;après le catalogue.
            </p>
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-kraft-900">Client</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="customerName">Nom complet</label>
            <input
              id="customerName" type="text" maxLength={200}
              value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="customerEmail">E-mail</label>
            <input
              id="customerEmail" type="email" maxLength={200}
              value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="customerPhone">Téléphone</label>
            <input
              id="customerPhone" type="tel" maxLength={50}
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="country">Pays</label>
            <input
              id="country" type="text" maxLength={100}
              value={country} onChange={(e) => setCountry(e.target.value)}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="addressLine">Adresse</label>
            <input
              id="addressLine" type="text" maxLength={300}
              value={addressLine} onChange={(e) => setAddressLine(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="city">Ville</label>
            <select
              id="city" className="select"
              value={city} onChange={(e) => setCity(e.target.value)}
            >
              <option value="">— Sélectionnez un gouvernorat —</option>
              {TUNISIA_GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="postalCode">Code postal</label>
            <input
              id="postalCode" type="text" maxLength={30}
              value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-kraft-900">Paiement et statut</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="paymentMethod">Mode de paiement</label>
            <select
              id="paymentMethod" className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((p) => (
                <option key={p} value={p}>{paymentMethodLabel(p)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Statut initial</label>
            <select
              id="status" className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">Notes</label>
            <textarea
              id="notes" rows={3} maxLength={2000}
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className="textarea"
            />
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || items.length === 0}
        >
          {submitting ? "Création…" : "Créer la commande"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/admin/orders")}
          disabled={submitting}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
