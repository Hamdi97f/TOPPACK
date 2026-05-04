import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";
import { categorySchema } from "@/lib/validators";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides" }, { status: 400 });
  }
  try {
    const category = await apiClient.updateCategory(session.user.apiToken, id, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
    return NextResponse.json({ category });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la mise à jour de la catégorie");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  try {
    await apiClient.deleteCategory(session.user.apiToken, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la suppression de la catégorie");
  }
}
