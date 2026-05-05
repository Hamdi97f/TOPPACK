import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth";
import {
  adaptProduct,
  apiClient,
  parseOrderNotes,
  parseShippingAddress,
} from "@/lib/api-client";
import { ORDER_STATUSES, paymentMethodLabel, statusLabel } from "@/lib/utils";

/**
 * Escape a single CSV field per RFC 4180. Wraps in double quotes when the
 * value contains a comma, double quote, CR or LF; doubles any embedded
 * quotes. Also strips control characters that some spreadsheet apps treat
 * as field separators.
 *
 * Excel CSV-injection mitigation: prefix a leading single quote when the
 * value starts with `=`, `+`, `-`, `@`, TAB or CR. This neutralises formulas
 * that would otherwise be evaluated when the file is opened in Excel/LibreOffice
 * with a stored OS-command payload.
 */
function csvField(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  // Drop NUL and other low control chars that are illegal/awkward in CSV.
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvField).join(",");
}

export async function GET(req: Request) {
  const { session, response } = await requireAdmin();
  if (response || !session) return response!;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  try {
    const [orders, products] = await Promise.all([
      apiClient.listOrders(session.user.apiToken),
      apiClient.listProducts(session.user.apiToken).catch(() => []),
    ]);
    const productById = new Map(products.map((p) => [p.id, adaptProduct(p)]));

    const filtered =
      statusFilter && (ORDER_STATUSES as readonly string[]).includes(statusFilter)
        ? orders.filter((o) => o.status === statusFilter)
        : orders;
    const sorted = filtered.sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? "")
    );

    const header = [
      "Référence",
      "Date",
      "Statut",
      "Client",
      "Email",
      "Téléphone",
      "Adresse",
      "Ville",
      "Code postal",
      "Pays",
      "Paiement",
      "Quantité d'articles",
      "Articles",
      "Total",
      "Notes",
    ];

    const lines: string[] = [csvRow(header)];
    for (const o of sorted) {
      const ship = parseShippingAddress(o.shipping_address);
      const { paymentMethod, text: noteText } = parseOrderNotes(o.notes);
      const itemQty = o.order_items.reduce((s, i) => s + i.quantity, 0);
      const itemNames = o.order_items
        .map((i) => {
          const p = productById.get(i.product_id);
          return `${i.quantity}× ${p?.name ?? i.product_id}`;
        })
        .join(" | ");
      lines.push(
        csvRow([
          o.id,
          o.created_at ?? "",
          statusLabel(o.status),
          o.customer_name ?? "",
          o.customer_email ?? "",
          ship.customerPhone,
          ship.addressLine,
          ship.city,
          ship.postalCode,
          ship.country,
          paymentMethodLabel(paymentMethod),
          itemQty,
          itemNames,
          Number(o.total).toFixed(3),
          noteText,
        ])
      );
    }

    // Prepend a UTF-8 BOM so Excel auto-detects the encoding and renders
    // accented characters correctly. CRLF line endings match the RFC and
    // Windows spreadsheets.
    const body = "\ufeff" + lines.join("\r\n") + "\r\n";

    const today = new Date().toISOString().slice(0, 10);
    const filename = `commandes-${today}${statusFilter ? `-${statusFilter}` : ""}.csv`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "Échec de l'export des commandes");
  }
}
