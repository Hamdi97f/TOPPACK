import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";
import { categorySchema } from "@/lib/validators";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const categories = await apiClient.listCategories(session.user.apiToken);
    return NextResponse.json({ categories });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des catégories");
  }
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides" }, { status: 400 });
  }
  try {
    const category = await apiClient.createCategory(session.user.apiToken, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la création de la catégorie");
  }
}
