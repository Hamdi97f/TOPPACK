import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient, CACHE_TAGS } from "@/lib/api-client";
import { normaliseBoxComparatorSettings } from "@/lib/site-settings";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const settings = await apiClient.getSiteSettings(session.user.apiToken);
    return NextResponse.json({ boxComparator: settings.boxComparator });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement");
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
  const boxComparator = normaliseBoxComparatorSettings(body);
  try {
    const current = await apiClient.getSiteSettings(session.user.apiToken);
    const saved = await apiClient.setSiteSettings(session.user.apiToken, {
      ...current,
      boxComparator,
    });
    revalidateTag(CACHE_TAGS.siteSettings);
    return NextResponse.json({ boxComparator: saved.boxComparator });
  } catch (err) {
    return apiErrorResponse(err, "Échec de l'enregistrement");
  }
}
