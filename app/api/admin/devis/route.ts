import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";

/** List all quote requests for the admin panel. */
export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const records = await apiClient.listDevis(session.user.apiToken);
    return NextResponse.json({ devis: records });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des demandes de devis");
  }
}
