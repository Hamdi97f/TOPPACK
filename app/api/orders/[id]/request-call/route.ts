import { NextResponse } from "next/server";
import { apiClient, getServiceToken } from "@/lib/api-client";

const CALL_REQUEST_MARKER = "[CALL_REQUESTED]";

/**
 * Customer-facing endpoint backing the "Je préfère être rappelé" button on
 * the thank-you page. Appends a short note to the order so the admin sees the
 * request in the admin order detail; the order itself stays in `pending`
 * status (a manual phone call is still required before the team flips it to
 * `confirmed`).
 *
 * Idempotent: the marker is added at most once per order.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = await getServiceToken();
  let order;
  try {
    order = await apiClient.getOrder(token, id);
  } catch {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if ((order.status || "").toLowerCase() !== "pending") {
    return NextResponse.json(
      { error: "Cette commande n'est plus en attente." },
      { status: 409 }
    );
  }

  const currentNotes = (order.notes ?? "").toString();
  if (currentNotes.includes(CALL_REQUEST_MARKER)) {
    return NextResponse.json({ requested: true, alreadyRequested: true });
  }

  // Preserve the existing PAYMENT/SHIPPING markers and any free-text notes —
  // we just append a single, clearly labelled line.
  const nextNotes = currentNotes
    ? `${currentNotes}\n${CALL_REQUEST_MARKER} Le client souhaite être rappelé pour confirmer sa commande.`
    : `${CALL_REQUEST_MARKER} Le client souhaite être rappelé pour confirmer sa commande.`;

  try {
    await apiClient.updateOrder(token, id, { notes: nextNotes });
  } catch {
    return NextResponse.json(
      { error: "Échec de l'enregistrement de la demande." },
      { status: 500 }
    );
  }

  return NextResponse.json({ requested: true });
}
