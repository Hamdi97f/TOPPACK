import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient } from "@/lib/api-client";

// Branding assets are small by nature (favicons, OG card images). Cap raw
// bytes well under Netlify's ~6 MB Function payload limit (which is further
// inflated by base64 encoding of multipart/form-data).
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_SOCIAL = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// SVG is intentionally excluded: it can embed scripts and would be served
// via /api/files/<id> with the upstream content-type, creating an XSS vector.
const ALLOWED_FAVICON = new Set([
  "image/png",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/gif",
  "image/jpeg",
]);

export async function POST(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;

  const form = await req.formData();
  const file = form.get("file");
  const kindRaw = form.get("kind");
  const kind = kindRaw === "favicon" ? "favicon" : kindRaw === "social" ? "social" : null;

  if (!kind) {
    return NextResponse.json({ error: "Champ 'kind' invalide (attendu: social|favicon)" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (2 Mo maximum)" }, { status: 413 });
  }
  const allowed = kind === "favicon" ? ALLOWED_FAVICON : ALLOWED_SOCIAL;
  if (!allowed.has(file.type)) {
    return NextResponse.json({ error: "Type de fichier non pris en charge" }, { status: 415 });
  }

  try {
    const result = await apiClient.uploadFile(session.user.apiToken, file);
    // The upstream returned URL may not be publicly fetchable, so we serve
    // the bytes through our authenticated proxy at /api/files/<id>. This
    // matches how product images uploaded via the admin upload flow are
    // surfaced to the storefront (see lib/api-client.ts: resolveImageUrl).
    const url = `/api/files/${encodeURIComponent(result.file_id)}`;
    return NextResponse.json({ url });
  } catch (err) {
    return apiErrorResponse(err, "Échec du téléversement du fichier");
  }
}
