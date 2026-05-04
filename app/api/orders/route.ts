import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validators";
import { generateOrderReference } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid order data" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Load products and validate availability + price (NEVER trust client prices).
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "One or more products are unavailable" }, { status: 400 });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  const orderItemsData = data.items.map((i) => {
    const p = productMap.get(i.productId)!;
    if (p.stock < i.quantity) {
      throw new Error(`Insufficient stock for ${p.name}`);
    }
    const lineTotal = p.price * i.quantity;
    subtotal += lineTotal;
    return {
      productId: p.id,
      name: p.name,
      quantity: i.quantity,
      unitPrice: p.price,
      lineTotal,
    };
  });

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Decrement stock atomically.
      for (const item of orderItemsData) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error("Insufficient stock");
        }
      }
      return tx.order.create({
        data: {
          reference: generateOrderReference(),
          userId: session?.user?.id ?? null,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          addressLine: data.addressLine,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country,
          notes: data.notes ?? null,
          paymentMethod: data.paymentMethod,
          status: "PENDING",
          subtotal,
          total: subtotal,
          items: { create: orderItemsData },
        },
      });
    });
    return NextResponse.json({ id: order.id, reference: order.reference }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 400 }
    );
  }
}
