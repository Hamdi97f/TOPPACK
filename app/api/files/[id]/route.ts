import { NextResponse } from "next/server";
import { apiClient, ApiError } from "@/lib/api-client";

/**
 * Public file proxy. Streams a stored asset from the upstream api-gateway by
 * id, using the service token. Used to render product images that were
 * uploaded through `/api/admin/upload` without a publicly resolvable URL.
 *
 * Cached aggressively at the edge because file ids are immutable.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Identifiant de fichier invalide" }, { status: 400 });
  }
  try {
    const upstream = await apiClient.fetchFile(undefined, id);
    if (!upstream) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
    }
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Échec du téléchargement du fichier" }, { status: 500 });
  }
}
