import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { apiClient, ApiError } from "@/lib/api-client";
import { orderStatusUpdateSchema } from "@/lib/validators";

// The api-gateway uses PUT to update orders; we keep PATCH for the existing
// in-app callers and forward as a PUT.
async function updateStatus(req: Request, id: string) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = orderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  try {
    const order = await apiClient.updateOrder(session.user.apiToken, id, {
      status: parsed.data.status,
    });
    return NextResponse.json({ order });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status });
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
