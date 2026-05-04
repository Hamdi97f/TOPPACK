import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient, packProductDescription } from "@/lib/api-client";
import { productSchema } from "@/lib/validators";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides" }, { status: 400 });
  }
  const d = parsed.data;
  try {
    const product = await apiClient.updateProduct(session.user.apiToken, id, {
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
    return NextResponse.json({ product });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la mise à jour du produit");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  try {
    await apiClient.deleteProduct(session.user.apiToken, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la suppression du produit");
  }
}
