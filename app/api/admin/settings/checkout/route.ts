import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient, CACHE_TAGS } from "@/lib/api-client";
import { normaliseCheckoutSettings } from "@/lib/checkout-settings";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  try {
    const settings = await apiClient.getCheckoutSettings(session.user.apiToken);
    return NextResponse.json({ settings });
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des paramètres");
  }
}

export async function PUT(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  // Always normalise — never trust the client's shape. At least one payment
  // method must remain enabled to keep the checkout usable.
  const settings = normaliseCheckoutSettings(body);
  if (settings.paymentMethods.length === 0) {
    return NextResponse.json(
      { error: "Au moins un mode de paiement doit être activé" },
      { status: 400 }
    );
  }
  try {
    const saved = await apiClient.setCheckoutSettings(session.user.apiToken, settings);
    revalidateTag(CACHE_TAGS.siteSettings);
    return NextResponse.json({ settings: saved });
  } catch (err) {
    return apiErrorResponse(err, "Échec de l'enregistrement des paramètres");
  }
}
