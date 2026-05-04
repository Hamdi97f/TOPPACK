"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "./CartProvider";

export function AddToCartButton({
  product,
  disabled,
}: {
  product: Omit<CartItem, "quantity">;
  disabled?: boolean;
}) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        className="input w-24"
        disabled={disabled}
        aria-label="Quantity"
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
        {disabled ? "Out of stock" : added ? "Added!" : "Add to Cart"}
      </button>
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled}
        onClick={() => {
          add(product, qty);
          router.push("/cart");
        }}
      >
        Buy Now
      </button>
    </div>
  );
}
