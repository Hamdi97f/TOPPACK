import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { apiClient, ApiError } from "@/lib/api-client";
import { categorySchema } from "@/lib/validators";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const categories = await apiClient.listCategories(session.user.apiToken);
    return NextResponse.json({ categories });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status });
  }
}

export async function POST(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 });
  }
  try {
    const category = await apiClient.createCategory(session.user.apiToken, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status });
  }
}
