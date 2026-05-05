import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";
import { orderStatusUpdateSchema } from "@/lib/validators";

// The api-gateway uses PUT to update orders; we keep PATCH for the existing
// in-app callers and forward as a PUT.
async function updateStatus(req: Request, id: string) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = orderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  try {
    const order = await apiClient.updateOrder(session.user.apiToken, id, {
      status: parsed.data.status,
    });
    return NextResponse.json({ order });
  } catch (err) {
    return apiErrorResponse(err, "Échec de la mise à jour de la commande");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateStatus(req, id);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateStatus(req, id);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  try {
    const result = await apiClient.deleteOrder(session.user.apiToken, id);
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err, "Échec de la suppression de la commande");
  }
}
