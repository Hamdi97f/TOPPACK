import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";
import { normaliseIntegrationsSettings } from "@/lib/site-settings";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const settings = await apiClient.getSiteSettings(session.user.apiToken);
    return NextResponse.json({ integrations: settings.integrations });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des intégrations");
  }
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const integrations = normaliseIntegrationsSettings(body);
  try {
    const current = await apiClient.getSiteSettings(session.user.apiToken);
    const saved = await apiClient.setSiteSettings(session.user.apiToken, { ...current, integrations });
    return NextResponse.json({ integrations: saved.integrations });
  } catch (err) {
    return apiErrorResponse(err, "Échec de l'enregistrement");
  }
}
