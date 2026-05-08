import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import { apiClient, CACHE_TAGS } from "@/lib/api-client";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const { reviewId } = await params;
  try {
    const result = await apiClient.deleteProductReview(session.user.apiToken, reviewId);
    revalidateTag(CACHE_TAGS.categories);
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err, "Échec de la suppression de l'avis");
  }
}
