import { NextResponse } from "next/server";
import { apiClient, getServiceToken } from "@/lib/api-client";
import {
  clearOtpRecord,
  getOtpRecord,
  hashOtp,
  OTP_MAX_VERIFY_ATTEMPTS,
  setOtpRecord,
  timingSafeEqualHex,
} from "@/lib/otp-store";

/**
 * Verify a 6-digit OTP and, on success, transition the order to `confirmed`.
 *
 * Like `send-otp`, this endpoint is unauthenticated: the proof of ownership
 * is the customer's knowledge of both the order id (UUID) and the OTP
 * received by SMS. Server-side guards:
 *   - the WinSMS feature must be enabled;
 *   - the order must still be `pending`;
 *   - the OTP must exist, not be expired, and the verify counter must be
 *     under `OTP_MAX_VERIFY_ATTEMPTS`;
 *   - the candidate code is hashed and compared in constant time to the
 *     stored hash; the record is deleted on success and on lock-out.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const settings = await apiClient.getSiteSettings();
  if (!settings.winsms.enabled) {
    return NextResponse.json(
      { error: "La confirmation par SMS n'est pas activée." },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const codeRaw = (body as { code?: unknown })?.code;
  const code = typeof codeRaw === "string" ? codeRaw.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Code invalide. Saisissez les 6 chiffres reçus par SMS." },
      { status: 400 }
    );
  }

  const stored = await getOtpRecord(id).catch(() => null);
  if (!stored) {
    return NextResponse.json(
      { error: "Aucun code en attente. Demandez un nouveau code." },
      { status: 404 }
    );
  }
  const { record } = stored;

  if (Date.now() > Date.parse(record.expiresAt)) {
    await clearOtpRecord(id).catch(() => undefined);
    return NextResponse.json(
      { error: "Code expiré. Demandez un nouveau code." },
      { status: 410 }
    );
  }

  if (record.verifyCount >= OTP_MAX_VERIFY_ATTEMPTS) {
    await clearOtpRecord(id).catch(() => undefined);
    return NextResponse.json(
      {
        error:
          "Trop de tentatives. Demandez un nouveau code ou contactez le support.",
      },
      { status: 429 }
    );
  }

  const candidateHash = hashOtp(id, code);
  const matches = timingSafeEqualHex(record.codeHash, candidateHash);
  if (!matches) {
    // Persist the bumped attempt counter so brute-forcing the 6-digit space
    // is bounded to OTP_MAX_VERIFY_ATTEMPTS per generated code.
    await setOtpRecord(id, { ...record, verifyCount: record.verifyCount + 1 }).catch(
      () => undefined
    );
    const remaining = OTP_MAX_VERIFY_ATTEMPTS - (record.verifyCount + 1);
    return NextResponse.json(
      {
        error: "Code incorrect.",
        attemptsRemaining: Math.max(0, remaining),
      },
      { status: 400 }
    );
  }

  // Make sure the order is still confirmable before flipping its status.
  let order;
  const token = await getServiceToken();
  try {
    order = await apiClient.getOrder(token, id);
  } catch {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (!order || (order.status || "").toLowerCase() !== "pending") {
    await clearOtpRecord(id).catch(() => undefined);
    return NextResponse.json(
      { error: "Cette commande ne peut plus être confirmée." },
      { status: 409 }
    );
  }

  try {
    await apiClient.updateOrder(token, id, { status: "confirmed" });
  } catch {
    return NextResponse.json(
      { error: "Échec de la confirmation. Veuillez réessayer." },
      { status: 500 }
    );
  }

  // Single-use: clear the record so the same code can't be replayed.
  await clearOtpRecord(id).catch(() => undefined);

  return NextResponse.json({ confirmed: true, status: "confirmed" });
}
