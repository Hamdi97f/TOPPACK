import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice, paymentMethodLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="container-x py-10 max-w-2xl mx-auto">
      <div className="card p-8 text-center">
        <div className="text-5xl mb-2">✅</div>
        <h1 className="text-2xl font-bold text-kraft-900">Thank you for your order!</h1>
        <p className="text-kraft-700 mt-2">
          Your order reference is <span className="font-mono font-semibold">{order.reference}</span>.
        </p>
        <p className="text-sm text-kraft-600 mt-1">
          A confirmation has been sent to <strong>{order.customerEmail}</strong>.
        </p>
      </div>
      <div className="card p-6 mt-6">
        <h2 className="font-bold mb-3">Order Details</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>{i.name} × {i.quantity}</span>
              <span>{formatPrice(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-kraft-200 mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
        <div className="text-sm text-kraft-600 mt-3">Payment: {paymentMethodLabel(order.paymentMethod)}</div>
        <div className="text-sm text-kraft-600">Status: {order.status}</div>
      </div>
      <div className="text-center mt-6">
        <Link href="/products" className="btn-primary">Continue Shopping</Link>
      </div>
    </div>
  );
}
