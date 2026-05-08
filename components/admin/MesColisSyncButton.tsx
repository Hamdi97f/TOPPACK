"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";

interface SyncResult {
  candidates: number;
  synced: Array<{ id: string; barcode: string }>;
  skipped: Array<{ id: string; reason: string }>;
  failed: Array<{ id: string; error: string }>;
}

/**
 * Admin button that pushes every confirmed-but-not-yet-synced order to
 * Mes Colis Express. Disabled while a request is in-flight; surfaces a
 * per-order summary on completion.
 */
export function MesColisSyncButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (running) return;
    if (!confirm("Synchroniser toutes les commandes confirmées avec Mes Colis Express ?")) {
      return;
    }
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders/sync-shipping", { method: "POST" });
      const data = await readJsonOrSignOut<SyncResult>(res);
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la synchronisation");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={running}
        className="btn-secondary !py-1 !px-3 text-sm"
      >
        {running ? "Synchronisation…" : "Synchroniser avec Mes Colis Express"}
      </button>
      {error && (
        <span className="text-xs text-red-700 max-w-xs text-right">{error}</span>
      )}
      {result && (
        <span className="text-xs text-kraft-700 max-w-xs text-right">
          {result.candidates === 0
            ? "Aucune commande confirmée à synchroniser."
            : `${result.synced.length}/${result.candidates} synchronisée(s)` +
              (result.skipped.length ? ` · ${result.skipped.length} ignorée(s)` : "") +
              (result.failed.length ? ` · ${result.failed.length} en erreur` : "")}
        </span>
      )}
    </div>
  );
}
