import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient, CACHE_TAGS } from "@/lib/api-client";
import { reviewCreateSchema } from "@/lib/validators";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  try {
    const reviews = await apiClient.listProductReviews(session.user.apiToken, id);
    return NextResponse.json({ reviews });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des avis");
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;

  // Validate the product id refers to a real product so a typo can't create
  // an orphaned review record floating in the categories table.
  try {
    await apiClient.getProduct(session.user.apiToken, id);
  } catch {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = reviewCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données invalides" },
      { status: 400 }
    );
  }
  try {
    const review = await apiClient.createProductReview(session.user.apiToken, id, parsed.data);
    // Reviews are stored as hidden categories — invalidate the categories tag
    // so the storefront product page picks up the new record on next render.
    revalidateTag(CACHE_TAGS.categories);
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la création de l'avis");
  }
}
