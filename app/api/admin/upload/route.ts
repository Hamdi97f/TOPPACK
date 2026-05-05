import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (5 Mo maximum)" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Type de fichier non pris en charge" }, { status: 415 });
  }
  try {
    const result = await apiClient.uploadFile(session.user.apiToken, file);
    // Always surface a browser-loadable URL: prefer the gateway-provided URL,
    // otherwise route through our own /api/files/{id} proxy. Returning the
    // bare file_id here used to break product images on the storefront.
    const url = result.url || `/api/files/${encodeURIComponent(result.file_id)}`;
    return NextResponse.json({ url, ...result });
  } catch (err) {
    return apiErrorResponse(err, "Échec du téléversement du fichier");
  }
}
