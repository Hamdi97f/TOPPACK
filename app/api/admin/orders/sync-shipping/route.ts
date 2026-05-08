import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import {
  adaptProduct,
  apiClient,
  buildOrderNotes,
  parseOrderNotes,
  parseShippingAddress,
} from "@/lib/api-client";
import {
  extractBarcode,
  MesColisError,
  mesColisClient,
} from "@/lib/mescolis";

/**
 * Push every confirmed-but-not-yet-synced order to Mes Colis Express.
 *
 * For each candidate order we:
 *   1. Build the Mes Colis create-order payload from the order's shipping
 *      address, customer details, items and total.
 *   2. POST it to `/api/orders/Create`.
 *   3. Persist the returned `barcode` in the order's notes (as a `MESCOLIS:`
 *      marker) so subsequent sync runs skip the order.
 *
 * The endpoint is best-effort per-order: a failure on one order does not
 * abort the run. The response carries a per-order summary so the admin UI
 * can surface partial successes.
 */
export async function POST() {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;
  const token = session.user.apiToken;

  let settings;
  try {
    settings = await apiClient.getSiteSettings(token);
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des paramètres");
  }
  if (!settings.mescolis.enabled || !settings.mescolis.apiToken) {
    return NextResponse.json(
      {
        error:
          "La synchronisation Mes Colis Express n'est pas configurée. Renseignez le jeton dans les paramètres.",
      },
      { status: 400 }
    );
  }

  let orders;
  try {
    orders = await apiClient.listOrders(token);
  } catch (err) {
    return apiErrorResponse(err, "Échec du chargement des commandes");
  }

  // Resolve product names once — the create payload requires `product_name`
  // and we want a human-readable label rather than a UUID.
  const products = await apiClient.listProducts(token).catch(() => []);
  const productNameById = new Map(
    products.map((p) => [p.id, adaptProduct(p).name])
  );

  const candidates = orders.filter((o) => {
    if (o.status !== "confirmed") return false;
    const { mescolisBarcode } = parseOrderNotes(o.notes);
    return !mescolisBarcode;
  });

  const synced: Array<{ id: string; barcode: string }> = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const order of candidates) {
    const ship = parseShippingAddress(order.shipping_address);
    const { paymentMethod, shippingFee, text: noteText } = parseOrderNotes(order.notes);

    if (!ship.customerPhone) {
      skipped.push({ id: order.id, reason: "Téléphone du client manquant." });
      continue;
    }
    if (!ship.city) {
      skipped.push({ id: order.id, reason: "Gouvernorat (Ville) manquant." });
      continue;
    }

    // Build a short product name from the order items (capped to keep the
    // upstream payload small).
    const productLabel = order.order_items
      .slice(0, 3)
      .map((i) => {
        const name = productNameById.get(i.product_id) || i.product_id;
        return i.quantity > 1 ? `${name} x${i.quantity}` : name;
      })
      .join(", ") || "Commande";

    const totalPrice =
      Number(order.total || 0) +
      (typeof shippingFee === "number" ? shippingFee : 0);

    try {
      const result = await mesColisClient.createOrder(settings.mescolis.apiToken, {
        product_name: productLabel,
        client_name: order.customer_name || ship.customerPhone,
        address: ship.addressLine || ship.city,
        gouvernerate: ship.city,
        city: ship.city,
        location: ship.addressLine,
        Tel1: ship.customerPhone,
        price: Number.isFinite(totalPrice) ? totalPrice : 0,
        exchange: "0",
        open_ordre: "0",
        note: noteText.trim().slice(0, 500),
      });
      const barcode = extractBarcode(result);
      if (!barcode) {
        failed.push({
          id: order.id,
          error: "Réponse Mes Colis sans code-barres exploitable.",
        });
        continue;
      }

      // Persist the barcode in the order notes so the next sync run skips
      // this order. Re-emit `PAYMENT:` / `SHIPPING:` markers so they
      // continue to round-trip through `parseOrderNotes`.
      const newNotes = buildOrderNotes(
        paymentMethod || "CASH_ON_DELIVERY",
        noteText || null,
        shippingFee,
        barcode
      );
      try {
        await apiClient.updateOrder(token, order.id, { notes: newNotes });
      } catch (persistErr) {
        // The order is already at the shipping company — surface this so
        // the admin can manually reconcile if needed.
        failed.push({
          id: order.id,
          error: `Synchronisée (barcode ${barcode}) mais l'enregistrement local a échoué : ${
            persistErr instanceof Error ? persistErr.message : "erreur inconnue"
          }`,
        });
        continue;
      }
      synced.push({ id: order.id, barcode });
    } catch (err) {
      const message =
        err instanceof MesColisError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Échec de la synchronisation";
      failed.push({ id: order.id, error: message });
    }
  }

  return NextResponse.json({
    candidates: candidates.length,
    synced,
    skipped,
    failed,
  });
}
