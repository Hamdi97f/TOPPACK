import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// Netlify synchronous Functions cap the total request payload at ~6 MB after
// base64 encoding. Multipart/form-data plus that base64 inflation means a raw
// file much larger than ~4 MB will be rejected by Netlify's proxy with a
// generic HTML "Internal server error" page — before our handler ever runs.
// Cap raw bytes at 4 MB to stay safely under that platform limit.
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (4 Mo maximum)" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Type de fichier non pris en charge" }, { status: 415 });
  }
  try {
    const result = await apiClient.uploadProductImage(session.user.apiToken, id, file);
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err, "Échec du téléversement de l'image du produit");
  }
}
