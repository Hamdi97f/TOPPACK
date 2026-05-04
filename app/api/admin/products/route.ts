import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { apiClient, ApiError, packProductDescription } from "@/lib/api-client";
import { productSchema } from "@/lib/validators";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const products = await apiClient.listProducts(session.user.apiToken);
    return NextResponse.json({ products });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const msg = err instanceof Error ? err.message : "Failed to load products";
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }
  const d = parsed.data;
  try {
    const product = await apiClient.createProduct(session.user.apiToken, {
      name: d.name,
      description: packProductDescription(d.description, {
        sku: d.sku,
        slug: d.slug,
        lengthCm: d.lengthCm,
        widthCm: d.widthCm,
        heightCm: d.heightCm,
        wallType: d.wallType,
        isFeatured: d.isFeatured,
      }),
      price: d.price,
      stock: d.stock,
      category_id: d.categoryId,
      image_url: d.imageUrl ?? null,
      is_active: d.isActive ?? true,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const msg = err instanceof Error ? err.message : "Failed to create product";
    return NextResponse.json({ error: msg }, { status });
  }
}
