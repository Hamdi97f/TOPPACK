/**
 * Thin client for the WinSMS.tn HTTP SMS gateway.
 *
 * Only the single-recipient send-sms action is used by the storefront — for
 * the OTP order-auto-confirmation flow. Bulk campaigns and reporting endpoints
 * are intentionally not wired up here.
 *
 * API reference: https://www.winsmspro.com/sms/sms/api?action=send-sms
 */

const WINSMS_SEND_URL = "https://www.winsmspro.com/sms/sms/api";

export interface SendSmsParams {
  apiKey: string;
  /** Approved sender id (alphanumeric, ≤ 11 chars). */
  sender: string;
  /** Recipient in WinSMS format: `216XXXXXXXX` (digits only, no `+`/`00`). */
  to: string;
  /** UTF-8 message body — Unicode (Arabic, accents, emojis) is supported. */
  message: string;
}

export interface SendSmsResult {
  ok: boolean;
  /** Gateway response code: `"ok"` on success, otherwise a numeric error code. */
  code: string;
  /** Human-readable status message returned by the gateway. */
  message: string;
  /** SMS reference returned on successful sends — useful for status tracking. */
  reference?: string;
}

/**
 * Normalise a free-form Tunisian phone number to the strict WinSMS format
 * (`216XXXXXXXX`). Accepts inputs like `+216 55 123 456`, `0021655123456`,
 * `55 123 456` and `21655123456`. Returns `null` when the resulting digits
 * don't form a valid Tunisian mobile/fixed number.
 *
 * Rules enforced:
 *   - country code `216` is added if missing,
 *   - `+`, `00`, spaces, dashes and parentheses are stripped,
 *   - the final string must be exactly `216` followed by 8 digits.
 */
export function normaliseTunisianPhone(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  // Strip everything that isn't a digit or a leading "+".
  let digits = input.trim().replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return null;
  // Local 8-digit number → prepend the Tunisian country code.
  if (digits.length === 8) digits = "216" + digits;
  if (!/^216\d{8}$/.test(digits)) return null;
  return digits;
}

/**
 * Send a single SMS through WinSMS. Errors are surfaced as a result object
 * (never thrown) so the caller can decide whether to retry, fall back, or
 * surface a friendly error to the customer.
 *
 * The api uses GET with query parameters; the message must be URL-encoded.
 * `fetch` does this automatically when we build the URL via `URLSearchParams`.
 */
export async function sendWinSmsSingle(params: SendSmsParams): Promise<SendSmsResult> {
  if (!params.apiKey || !params.sender || !params.to || !params.message) {
    return { ok: false, code: "client_error", message: "Paramètres SMS manquants" };
  }

  const url = new URL(WINSMS_SEND_URL);
  url.searchParams.set("action", "send-sms");
  url.searchParams.set("api_key", params.apiKey);
  url.searchParams.set("to", params.to);
  url.searchParams.set("from", params.sender);
  url.searchParams.set("sms", params.message);

  let res: Response;
  try {
    res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  } catch (err) {
    return {
      ok: false,
      code: "network_error",
      message: err instanceof Error ? err.message : "Erreur réseau WinSMS",
    };
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (data && typeof data === "object") {
    const r = data as Record<string, unknown>;
    const code = typeof r.code === "string" ? r.code : String(r.code ?? res.status);
    const message = typeof r.message === "string" ? r.message : "";
    const reference = typeof r.reference === "string" ? r.reference : undefined;
    return {
      ok: code === "ok",
      code,
      message: message || (code === "ok" ? "Successfully Sent" : `WinSMS error ${code}`),
      reference,
    };
  }

  return {
    ok: false,
    code: String(res.status),
    message: typeof data === "string" && data ? data : `Réponse WinSMS inattendue (${res.status})`,
  };
}

/**
 * Build the OTP SMS body from the admin-configured template. The substring
 * `{code}` is replaced with the freshly-generated code; if the template
 * doesn't reference `{code}` the code is appended on its own line so the
 * customer always receives it.
 */
export function buildOtpMessage(template: string, code: string): string {
  const tpl = (template || "").trim();
  if (!tpl) return code;
  if (tpl.includes("{code}")) return tpl.replace(/\{code\}/g, code);
  return `${tpl}\n${code}`;
}

/**
 * Build the order-received confirmation SMS body from the admin-configured
 * template. Supported placeholders are `{name}`, `{items}` and `{total}`;
 * unknown placeholders are left as-is so admins can spot template typos in
 * the customer's message rather than seeing them silently swallowed. Per
 * the requirement the order number/reference is intentionally not exposed.
 */
export function buildOrderConfirmMessage(
  template: string,
  vars: { name: string; items: string; total: string }
): string {
  const tpl = (template || "").trim();
  if (!tpl) return `${vars.name} — ${vars.items} — ${vars.total}`;
  return tpl
    .replace(/\{name\}/g, vars.name)
    .replace(/\{items\}/g, vars.items)
    .replace(/\{total\}/g, vars.total);
}
