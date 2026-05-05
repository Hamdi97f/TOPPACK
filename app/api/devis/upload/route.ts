import { NextResponse } from "next/server";
import { apiClient, ApiError, getServiceToken } from "@/lib/api-client";

/**
 * Public logo upload used by the "demande de devis" form. Anonymous callers
 * can upload a logo image; bytes are stored upstream via the service token
 * and the returned id is exposed through the existing `/api/files/{id}`
 * proxy. The form embeds the resulting URL in the devis record.
 *
 * Bounds:
 *  - 2 MB max payload (Netlify Function limit room).
 *  - Common raster formats only; SVG is intentionally rejected because the
 *    /api/files proxy serves bytes with the upstream content-type, which
 *    would let an attacker host script-bearing SVGs on this origin.
 */
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (2 Mo maximum)" },
      { status: 413 }
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non pris en charge (JPG, PNG, WEBP, GIF)" },
      { status: 415 }
    );
  }

  try {
    const token = await getServiceToken();
    const result = await apiClient.uploadFile(token, file);
    const url = `/api/files/${encodeURIComponent(result.file_id)}`;
    return NextResponse.json({ url, name: file.name });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Échec du téléversement du fichier" },
      { status: 500 }
    );
  }
}
