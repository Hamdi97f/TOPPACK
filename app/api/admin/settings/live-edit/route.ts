import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient, CACHE_TAGS } from "@/lib/api-client";
import { normaliseLiveEditsAgainstRegistry } from "@/lib/live-edit/editable";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const settings = await apiClient.getSiteSettings(session.user.apiToken);
    return NextResponse.json({ liveEdits: settings.liveEdits });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des éditions en direct");
  }
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  // Accept either the full `{ liveEdits: {...} }` envelope (matching the GET
  // shape) or the inner overrides object directly.
  const raw =
    body && typeof body === "object" && "liveEdits" in (body as Record<string, unknown>)
      ? (body as Record<string, unknown>).liveEdits
      : body;
  const liveEdits = normaliseLiveEditsAgainstRegistry(raw);
  try {
    const current = await apiClient.getSiteSettings(session.user.apiToken);
    const saved = await apiClient.setSiteSettings(session.user.apiToken, {
      ...current,
      liveEdits,
    });
    revalidateTag(CACHE_TAGS.siteSettings);
    return NextResponse.json({ liveEdits: saved.liveEdits });
  } catch (err) {
    return apiErrorResponse(err, "Échec de l'enregistrement");
  }
}
