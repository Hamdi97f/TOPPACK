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
import type { ManualOrderProduct } from "./ManualOrderForm";

export type OrderEditInitial = {
  id: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string;
  paymentMethod: PaymentMethod;
  shippingFee: number | null;
  mescolisBarcode: string | null;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
};

type LineItem = {
  productId: string;
  quantity: number;
  /** Effective unit price displayed in the form. */
  unitPrice: number;
  /**
   * When true, the unit price entered by the admin is forwarded to the
   * gateway as-is. When false, the api-gateway recomputes it from the
   * current catalog price (matching the storefront behaviour).
   */
  overridePrice: boolean;
};

export function OrderEditForm({
  initial,
  products,
}: {
  initial: OrderEditInitial;
  products: ManualOrderProduct[];
}) {
  const router = useRouter();
  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products]
  );

  const [items, setItems] = useState<LineItem[]>(() =>
    initial.items.map((it) => {
      const catalog = productById.get(it.productId);
      const catalogPrice = catalog ? Number(catalog.price) : 0;
      // Treat a unit price that differs from the current catalog price as an
      // explicit override so we don't silently snap it back on save.
      const overridePrice =
        !catalog || Math.abs(catalogPrice - it.unitPrice) > 0.0005;
      return {
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        overridePrice,
      };
    })
  );
  const [status, setStatus] = useState<OrderStatus>(initial.status);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerEmail, setCustomerEmail] = useState(initial.customerEmail);
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone);
  const [addressLine, setAddressLine] = useState(initial.addressLine);
  const [city, setCity] = useState(initial.city);
  const [postalCode, setPostalCode] = useState(initial.postalCode);
  const [country, setCountry] = useState(initial.country);
  const [notes, setNotes] = useState(initial.notes);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial.paymentMethod);
  const [shippingFee, setShippingFee] = useState<string>(
    initial.shippingFee != null ? String(initial.shippingFee) : ""
  );
  const [mescolisBarcode, setMescolisBarcode] = useState<string>(
    initial.mescolisBarcode ?? ""
  );
  const [productPick, setProductPick] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsTotal = useMemo(
    () => items.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0),
    [items]
  );
  const shippingFeeNumber = (() => {
    const v = Number(shippingFee);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  })();
  const grandTotal = itemsTotal + shippingFeeNumber;

  function addProduct() {
    if (!productPick) return;
    const catalog = productById.get(productPick);
    if (!catalog) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productPick);
      if (existing) {
        return prev.map((i) =>
          i.productId === productPick ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: productPick,
          quantity: 1,
          unitPrice: Number(catalog.price),
          overridePrice: false,
        },
      ];
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

  function updateUnitPrice(productId: string, raw: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const v = Number(raw);
        const unitPrice = Number.isFinite(v) && v >= 0 ? v : 0;
        return { ...i, unitPrice, overridePrice: true };
      })
    );
  }

  function resetUnitPrice(productId: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const catalog = productById.get(productId);
        return {
          ...i,
          unitPrice: catalog ? Number(catalog.price) : i.unitPrice,
          overridePrice: false,
        };
      })
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError("La commande doit contenir au moins un article.");
      return;
    }
    setSubmitting(true);
    try {
      const trimmedBarcode = mescolisBarcode.trim();
      const payload = {
        status,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        notes: notes.trim(),
        paymentMethod,
        shippingFee: shippingFee === "" ? null : Number(shippingFee),
        mescolisBarcode: trimmedBarcode === "" ? null : trimmedBarcode,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          overridePrice: i.overridePrice,
          unitPriceOverride: i.overridePrice ? i.unitPrice : null,
        })),
      };
      const res = await fetch(`/api/admin/orders/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await readJsonOrSignOut(res);
      router.push(`/admin/orders/${initial.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
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
            <option value="">— Ajouter un produit —</option>
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

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-kraft-100 text-kraft-800">
                <tr>
                  <th className="text-left p-2">Produit</th>
                  <th className="text-right p-2 w-24">Qté</th>
                  <th className="text-right p-2 w-40">Unité</th>
                  <th className="text-right p-2">Total</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((li) => {
                  const p = productById.get(li.productId);
                  return (
                    <tr key={li.productId} className="border-t border-kraft-100">
                      <td className="p-2">
                        <div>{p?.name ?? li.productId}</div>
                        {li.overridePrice && (
                          <div className="text-xs text-kraft-600">
                            Prix personnalisé{" "}
                            <button
                              type="button"
                              onClick={() => resetUnitPrice(li.productId)}
                              className="text-kraft-700 hover:underline"
                            >
                              (réinitialiser)
                            </button>
                          </div>
                        )}
                      </td>
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
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          value={li.unitPrice}
                          onChange={(e) => updateUnitPrice(li.productId, e.target.value)}
                          className="input !py-1 !px-2 text-right w-32"
                        />
                      </td>
                      <td className="p-2 text-right">
                        {formatPrice(li.unitPrice * li.quantity)}
                      </td>
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
                <tr className="border-t border-kraft-100">
                  <td colSpan={3} className="p-2 text-right">Sous-total</td>
                  <td className="p-2 text-right">{formatPrice(itemsTotal)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={3} className="p-2 text-right text-kraft-700">
                    Livraison
                  </td>
                  <td className="p-2 text-right text-kraft-700">
                    {formatPrice(shippingFeeNumber)}
                  </td>
                  <td></td>
                </tr>
                <tr className="font-bold border-t border-kraft-200">
                  <td colSpan={3} className="p-2 text-right">Total</td>
                  <td className="p-2 text-right">{formatPrice(grandTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <p className="text-xs text-kraft-600 mt-1">
              Par défaut le prix unitaire est recalculé côté serveur d&apos;après
              le catalogue. Modifiez la valeur pour appliquer un prix
              personnalisé sur cette commande.
            </p>
          </div>
        ) : (
          <p className="text-sm text-kraft-600">Aucun article.</p>
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
              {!(TUNISIA_GOVERNORATES as readonly string[]).includes(city) && city !== "" && (
                <option value={city}>{city}</option>
              )}
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
        <h2 className="font-semibold text-kraft-900">Paiement, livraison et statut</h2>
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
            <label className="label" htmlFor="status">Statut</label>
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
          <div>
            <label className="label" htmlFor="shippingFee">Frais de livraison (DT)</label>
            <input
              id="shippingFee" type="number" min={0} step="0.001"
              value={shippingFee} onChange={(e) => setShippingFee(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="mescolisBarcode">Mes Colis Express (code-barres)</label>
            <input
              id="mescolisBarcode" type="text" maxLength={100}
              pattern="[A-Za-z0-9_\-]*"
              value={mescolisBarcode} onChange={(e) => setMescolisBarcode(e.target.value)}
              className="input font-mono"
            />
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

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || items.length === 0}
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push(`/admin/orders/${initial.id}`)}
          disabled={submitting}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
