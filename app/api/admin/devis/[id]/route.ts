import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";
import { devisStatusUpdateSchema } from "@/lib/validators";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  try {
    const record = await apiClient.getDevis(session.user.apiToken, id);
    if (!record) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }
    return NextResponse.json({ devis: record });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement de la demande");
  }
}

async function update(req: Request, id: string) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = devisStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données invalides" },
      { status: 400 }
    );
  }
  try {
    const record = await apiClient.updateDevis(session.user.apiToken, id, parsed.data);
    return NextResponse.json({ devis: record });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la mise à jour de la demande");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return update(req, id);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return update(req, id);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  try {
    const result = await apiClient.deleteDevis(session.user.apiToken, id);
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err, "Échec de la suppression de la demande");
  }
}
