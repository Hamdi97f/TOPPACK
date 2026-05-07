"use client";

import { useState } from "react";
import { useCart, type CartItem } from "./CartProvider";
import { BuyNowModal } from "./BuyNowModal";
import type { CheckoutSettings } from "@/lib/checkout-settings";
import type { ShippingSettings } from "@/lib/site-settings";

export function AddToCartButton({
  product,
  disabled,
  checkoutSettings,
  shipping,
  requireAccount,
}: {
  product: Omit<CartItem, "quantity">;
  disabled?: boolean;
  checkoutSettings: CheckoutSettings;
  shipping: ShippingSettings;
  requireAccount: boolean;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buyNowOpen, setBuyNowOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="input w-24"
          disabled={disabled}
          aria-label="Quantité"
        />
        <button
          type="button"
          className="btn-primary"
          disabled={disabled}
          onClick={() => {
            add(product, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
        >
          {disabled ? "Rupture de stock" : added ? "Ajouté !" : "Ajouter au panier"}
        </button>
        <button
          type="button"
          className="btn bg-green-600 text-white hover:bg-green-700"
          disabled={disabled}
          onClick={() => setBuyNowOpen(true)}
        >
          Acheter maintenant
        </button>
      </div>

      <BuyNowModal
        open={buyNowOpen}
        onClose={() => setBuyNowOpen(false)}
        product={{
          productId: product.productId,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
        }}
        checkoutSettings={checkoutSettings}
        shipping={shipping}
        requireAccount={requireAccount}
      />
    </>
  );
}
