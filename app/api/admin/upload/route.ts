import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { apiClient, ApiError } from "@/lib/api-client";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  try {
    const result = await apiClient.uploadFile(session.user.apiToken, file);
    // The api-gateway returns file metadata; if it provides a URL, surface it,
    // otherwise fall back to the file id which the frontend can use as a
    // reference.
    const url = result.url || result.file_id;
    return NextResponse.json({ url, ...result });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status });
  }
}
