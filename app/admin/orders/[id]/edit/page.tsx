import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  adaptProduct,
  apiClient,
  ApiError,
  parseOrderNotes,
  parseShippingAddress,
} from "@/lib/api-client";
import { ORDER_STATUSES, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "@/lib/utils";
import {
  OrderEditForm,
  type OrderEditInitial,
} from "@/components/admin/OrderEditForm";
import type { ManualOrderProduct } from "@/components/admin/ManualOrderForm";

export const dynamic = "force-dynamic";

export default async function AdminOrderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/login?callbackUrl=/admin/orders");
  const token = session.user.apiToken;
  const { id } = await params;

  let order;
  try {
    order = await apiClient.getOrder(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  // The catalog list is short-lived cached in api-client, so this call is
  // free on subsequent navigations from the order list.
  const rawProducts = await apiClient.listProducts(token).catch(() => []);
  const products: ManualOrderProduct[] = rawProducts
    .map(adaptProduct)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock: p.stock,
      isActive: p.isActive,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const productPriceById = new Map(products.map((p) => [p.id, Number(p.price)]));

  const notes = parseOrderNotes(order.notes);
  const shipping = parseShippingAddress(order.shipping_address);

  const status: OrderStatus = (ORDER_STATUSES as readonly string[]).includes(order.status)
    ? (order.status as OrderStatus)
    : "pending";
  const paymentMethod: PaymentMethod = (PAYMENT_METHODS as readonly string[]).includes(notes.paymentMethod ?? "")
    ? (notes.paymentMethod as PaymentMethod)
    : "CASH_ON_DELIVERY";

  const initial: OrderEditInitial = {
    id: order.id,
    status,
    customerName: order.customer_name ?? "",
    customerEmail: order.customer_email ?? "",
    customerPhone: shipping.customerPhone,
    addressLine: shipping.addressLine,
    city: shipping.city,
    postalCode: shipping.postalCode,
    country: shipping.country,
    notes: notes.text.trim(),
    paymentMethod,
    shippingFee: notes.shippingFee,
    mescolisBarcode: notes.mescolisBarcode,
    items: order.order_items.map((it) => {
      // Prefer the historical unit_price from the order; fall back to the
      // current catalog price if the order somehow has none recorded.
      const unit = Number(it.unit_price);
      const fallback = productPriceById.get(it.product_id) ?? 0;
      return {
        productId: it.product_id,
        quantity: it.quantity,
        unitPrice: Number.isFinite(unit) && unit > 0 ? unit : fallback,
      };
    }),
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link href={`/admin/orders/${order.id}`} className="text-sm text-kraft-700 hover:underline">
          ← Retour à la commande
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-kraft-900 mb-2">Modifier la commande</h1>
      <p className="text-sm text-kraft-700 mb-4 font-mono">{order.id}</p>
      <OrderEditForm initial={initial} products={products} />
    </div>
  );
}
