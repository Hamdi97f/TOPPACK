import { createHash } from "crypto";

/**
 * Send a `Purchase` event to the Meta Conversions API. Best-effort:
 * never throws, never blocks the caller — failures are logged and
 * swallowed so the order flow is unaffected.
 *
 * Deduplication with the browser-side Pixel is achieved by sharing the
 * same `event_id` (the order id) and the same `event_name`.
 *
 * The token is read from the admin-configured `IntegrationsSettings`.
 * https://developers.facebook.com/docs/marketing-api/conversions-api/
 */

export interface PurchaseEventInput {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  /** Used as `event_id` for browser-server dedup. */
  eventId: string;
  email?: string;
  phone?: string;
  value: number;
  currency: string;
  /** URL of the page where the conversion happened (server's best guess). */
  eventSourceUrl?: string;
  /** Forwarded from the request that triggered the order, for matching. */
  clientIpAddress?: string;
  clientUserAgent?: string;
  /** Facebook click/browser cookies, when known. */
  fbc?: string;
  fbp?: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalisePhone(value: string): string {
  // Meta wants digits only.
  return value.replace(/\D+/g, "");
}

export async function sendMetaPurchaseEvent(input: PurchaseEventInput): Promise<void> {
  if (!input.pixelId || !input.accessToken) return;
  if (!/^[0-9]{1,32}$/.test(input.pixelId)) return;

  const userData: Record<string, string | string[]> = {};
  if (input.email) userData.em = sha256(normaliseEmail(input.email));
  if (input.phone) userData.ph = sha256(normalisePhone(input.phone));
  if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;
  if (input.fbc) userData.fbc = input.fbc;
  if (input.fbp) userData.fbp = input.fbp;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: userData,
        custom_data: {
          currency: input.currency || "EUR",
          value: Number(input.value.toFixed(2)),
        },
      },
    ],
  };
  if (input.testEventCode) payload.test_event_code = input.testEventCode;

  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(
    input.pixelId
  )}/events?access_token=${encodeURIComponent(input.accessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[meta-capi] non-2xx response", res.status, body.slice(0, 500));
    }
  } catch (err) {
    console.warn("[meta-capi] request failed", err);
  }
}
