import { NextResponse } from "next/server";
import { apiClient, getServiceToken, parseShippingAddress } from "@/lib/api-client";
import {
  buildOtpMessage,
  normaliseTunisianPhone,
  sendWinSmsSingle,
} from "@/lib/winsms";
import {
  getOtpRecord,
  hashOtp,
  OTP_MAX_SENDS,
  OTP_TTL_MS,
  setOtpRecord,
  type OtpRecord,
} from "@/lib/otp-store";

/**
 * Generate and send a fresh 6-digit OTP for the given order.
 *
 * The endpoint is intentionally callable without an authenticated session:
 * the proof of ownership is the customer's ability to receive the SMS at the
 * phone number recorded on the order. The order id is a UUID, so it cannot be
 * easily guessed.
 *
 * Server-side guards:
 *   - the WinSMS feature must be enabled in admin settings;
 *   - the order must exist and still be `pending`;
 *   - at most `OTP_MAX_SENDS` sends are allowed per order.
 *
 * The plain code is sent only via SMS — never returned to the caller.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const settings = await apiClient.getSiteSettings();
  if (!settings.winsms.enabled) {
    return NextResponse.json(
      { error: "La confirmation par SMS n'est pas activée." },
      { status: 404 }
    );
  }

  // Read the order via the service account so anonymous customers can use the
  // flow. Pricing/status are recomputed server-side, never trusted from the
  // client.
  let order;
  try {
    const token = await getServiceToken();
    order = await apiClient.getOrder(token, id);
  } catch {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if ((order.status || "").toLowerCase() !== "pending") {
    return NextResponse.json(
      { error: "Cette commande ne peut plus être confirmée par SMS." },
      { status: 409 }
    );
  }

  const phoneRaw = parseShippingAddress(order.shipping_address).customerPhone;
  const phone = normaliseTunisianPhone(phoneRaw);
  if (!phone) {
    return NextResponse.json(
      {
        error:
          "Numéro de téléphone invalide ou manquant sur la commande. Contactez le support.",
      },
      { status: 400 }
    );
  }

  // Pull any existing record so we can rate-limit sends and bump the counter
  // before contacting the SMS gateway. A burst of identical sends would
  // otherwise be possible.
  const existing = await getOtpRecord(id).catch(() => null);
  const previousSends = existing?.record.sendCount ?? 0;
  if (previousSends >= OTP_MAX_SENDS) {
    return NextResponse.json(
      {
        error:
          "Nombre maximal d'envois atteint pour cette commande. Veuillez nous contacter.",
      },
      { status: 429 }
    );
  }

  // Generate a 6-digit code using `crypto.randomInt`, which draws from a
  // cryptographically secure pseudo-random source. We then store only a
  // sha-256 hash of the code (salted with order id + server secret) so an
  // attacker with read access to the OTP record cannot recover the plain
  // code.
  const { randomInt } = await import("crypto");
  const plainCode = String(randomInt(0, 1_000_000)).padStart(6, "0");

  const record: OtpRecord = {
    codeHash: hashOtp(id, plainCode),
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    sendCount: previousSends + 1,
    verifyCount: 0,
    phoneE164: phone,
  };

  // Persist before sending — if persistence fails we don't want a code
  // floating in the customer's phone with no server-side counterpart.
  try {
    await setOtpRecord(id, record);
  } catch {
    return NextResponse.json(
      { error: "Échec de la préparation du code. Veuillez réessayer." },
      { status: 500 }
    );
  }

  const sms = await sendWinSmsSingle({
    apiKey: settings.winsms.apiKey,
    sender: settings.winsms.senderId,
    to: phone,
    message: buildOtpMessage(settings.winsms.otpMessage, plainCode),
  });

  if (!sms.ok) {
    return NextResponse.json(
      {
        error:
          sms.code === "105"
            ? "Crédit SMS insuffisant. Contactez le support."
            : "Échec de l'envoi du SMS. Veuillez réessayer.",
        winsmsCode: sms.code,
      },
      { status: 502 }
    );
  }

  // Mask the phone before echoing it back to the client — only the last two
  // digits are surfaced so the customer recognises which line received the
  // SMS without the full number being shown to a casual onlooker.
  const masked = phone.replace(/^(216)(\d{6})(\d{2})$/, "$1******$3");

  return NextResponse.json({
    sent: true,
    phoneMasked: masked,
    expiresAt: record.expiresAt,
    sendsRemaining: OTP_MAX_SENDS - record.sendCount,
  });
}
