import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";
import { normaliseContactInfo } from "@/lib/site-settings";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const settings = await apiClient.getSiteSettings(session.user.apiToken);
    return NextResponse.json({ contact: settings.contact });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des informations de contact");
  }
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const contact = normaliseContactInfo(body);
  try {
    const current = await apiClient.getSiteSettings(session.user.apiToken);
    const saved = await apiClient.setSiteSettings(session.user.apiToken, { ...current, contact });
    return NextResponse.json({ contact: saved.contact });
  } catch (err) {
    return apiErrorResponse(err, "Échec de l'enregistrement");
  }
}
