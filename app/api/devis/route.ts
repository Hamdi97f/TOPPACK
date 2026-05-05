import { NextResponse } from "next/server";
import { apiClient, ApiError, getServiceToken } from "@/lib/api-client";
import { devisRequestSchema } from "@/lib/validators";

/**
 * Public endpoint to submit a "demande de devis" (quote request).
 *
 * Anonymous: callers do not need to be logged in. The handler authenticates
 * to the upstream api-gateway with the service account token. The resulting
 * record is stored as a hidden category (see `lib/devis.ts`).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = devisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Données invalides" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const token = await getServiceToken();
    const record = await apiClient.createDevis(token, {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      company: data.company,
      model: data.model,
      modelOther: data.modelOther || undefined,
      lengthCm: data.lengthCm,
      widthCm: data.widthCm,
      heightCm: data.heightCm,
      ondulation: data.ondulation,
      cannelure: data.cannelure,
      color: data.color,
      printing: data.printing,
      logoUrl: data.logoUrl || undefined,
      logoFileName: data.logoFileName || undefined,
      quantity: data.quantity,
      message: data.message || undefined,
    });
    return NextResponse.json(
      { id: record.id, reference: record.reference },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Échec de l'envoi de la demande" },
      { status: 500 }
    );
  }
}
