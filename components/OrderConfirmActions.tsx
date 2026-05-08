"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "choose" | "otp" | "callRequested" | "confirmed";

interface SendOtpResponse {
  sent?: boolean;
  phoneMasked?: string;
  expiresAt?: string;
  sendsRemaining?: number;
  error?: string;
}

interface VerifyOtpResponse {
  confirmed?: boolean;
  status?: string;
  error?: string;
  attemptsRemaining?: number;
}

interface RequestCallResponse {
  requested?: boolean;
  error?: string;
}

/**
 * Two-button widget rendered on `/orders/<id>/confirmation` when the WinSMS
 * auto-confirmation feature is enabled and the order is still `pending`.
 *
 * Button A — "Confirmer par SMS" → POSTs `/send-otp`, then asks for the code
 * and POSTs `/verify-otp`. On success the order status flips to `confirmed`
 * server-side and the page is refreshed so the badge updates.
 *
 * Button B — "Être rappelé" → POSTs `/request-call`, leaving the order in
 * `pending` but appending a note for the admin.
 */
export function OrderConfirmActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [sendsRemaining, setSendsRemaining] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const target = Date.parse(expiresAt);
    function tick() {
      const diff = Math.max(0, Math.round((target - Date.now()) / 1000));
      setSecondsLeft(diff);
    }
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);

  async function startOtp() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/send-otp`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as SendOtpResponse;
      if (!res.ok || !data.sent) {
        throw new Error(data.error || "Échec de l'envoi du code.");
      }
      setMode("otp");
      setPhoneMasked(data.phoneMasked ?? null);
      setSendsRemaining(typeof data.sendsRemaining === "number" ? data.sendsRemaining : null);
      setExpiresAt(data.expiresAt ?? null);
      setInfo("Un code à 6 chiffres vient d'être envoyé par SMS.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi du code.");
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    setCode("");
    await startOtp();
  }

  async function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as VerifyOtpResponse;
      if (!res.ok || !data.confirmed) {
        const remaining =
          typeof data.attemptsRemaining === "number"
            ? ` (${data.attemptsRemaining} tentative${data.attemptsRemaining > 1 ? "s" : ""} restante${data.attemptsRemaining > 1 ? "s" : ""})`
            : "";
        throw new Error((data.error || "Code incorrect.") + remaining);
      }
      setMode("confirmed");
      setInfo("Votre commande est confirmée. Merci !");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la vérification.");
    } finally {
      setBusy(false);
    }
  }

  async function requestCall() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/request-call`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as RequestCallResponse;
      if (!res.ok || !data.requested) {
        throw new Error(data.error || "Échec de l'enregistrement de la demande.");
      }
      setMode("callRequested");
      setInfo("Nous vous rappellerons sous peu pour confirmer votre commande.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement de la demande.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 mt-6">
      <h2 className="font-bold mb-2 text-kraft-900">Comment souhaitez-vous confirmer ?</h2>
      <p className="text-sm text-kraft-700 mb-4">
        Choisissez la confirmation automatique par SMS (rapide) ou demandez à
        être rappelé pour valider votre commande au téléphone.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded text-sm mb-3">{error}</div>
      )}
      {info && mode !== "choose" && (
        <div className="bg-green-50 text-green-700 p-3 rounded text-sm mb-3">{info}</div>
      )}

      {mode === "choose" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={startOtp}
            disabled={busy}
          >
            {busy ? "Envoi…" : "Confirmer par SMS (code OTP)"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={requestCall}
            disabled={busy}
          >
            {busy ? "Enregistrement…" : "Être rappelé pour confirmer"}
          </button>
        </div>
      )}

      {mode === "otp" && (
        <form onSubmit={verifyOtp} className="space-y-3">
          <p className="text-sm text-kraft-700">
            {phoneMasked ? (
              <>SMS envoyé au numéro <span className="font-mono">{phoneMasked}</span>.</>
            ) : (
              <>SMS envoyé au numéro indiqué dans votre commande.</>
            )}
            {secondsLeft !== null && secondsLeft > 0 && (
              <> Le code expire dans <strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</strong>.</>
            )}
          </p>
          <div>
            <label className="label" htmlFor="otp-code">Code à 6 chiffres</label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D+/g, "").slice(0, 6))}
              className="input font-mono tracking-widest text-center text-lg"
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={busy || code.length !== 6}>
              {busy ? "Vérification…" : "Confirmer ma commande"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={resendOtp}
              disabled={busy || (sendsRemaining !== null && sendsRemaining <= 0)}
              title={
                sendsRemaining !== null && sendsRemaining <= 0
                  ? "Plus d'envois disponibles"
                  : undefined
              }
            >
              Renvoyer le code
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setMode("choose");
                setError(null);
                setInfo(null);
                setCode("");
              }}
              disabled={busy}
            >
              Retour
            </button>
          </div>
          {sendsRemaining !== null && (
            <p className="text-xs text-kraft-600">
              Envois restants : {sendsRemaining}
            </p>
          )}
        </form>
      )}

      {mode === "confirmed" && (
        <div className="text-sm text-kraft-700">
          ✅ Votre commande est confirmée — vous n&apos;avez rien d&apos;autre à faire.
        </div>
      )}

      {mode === "callRequested" && (
        <div className="text-sm text-kraft-700">
          📞 Nous vous rappellerons sous peu au numéro indiqué pour confirmer votre commande.
        </div>
      )}
    </div>
  );
}
