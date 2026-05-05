"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import {
  HEX_COLOR_RE,
  type LiveEditFieldDef,
  type LiveEditRegionDef,
} from "@/lib/live-edit/registry";
import {
  isSafeAssetUrl,
  type LiveEditFieldValue,
  type LiveEditsSettings,
} from "@/lib/site-settings";

type Overrides = LiveEditsSettings;

/**
 * Live-edit admin editor.
 *
 * Two-pane layout: an iframe previewing the public site (with the overlay
 * script enabled by setting a cookie) on the left, and a tree of editable
 * regions + a typed property panel on the right.
 *
 * Edits are buffered locally — nothing hits the server until the admin clicks
 * "Enregistrer". After save, the iframe is reloaded so the new overrides take
 * effect.
 */
export function LiveEditClient({
  regions,
  initial,
}: {
  regions: LiveEditRegionDef[];
  initial: Overrides;
}) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Bumping this remounts the iframe (forces a hard reload after save).
  const [iframeKey, setIframeKey] = useState(0);

  const [persisted, setPersisted] = useState<Overrides>(initial);
  const [draft, setDraft] = useState<Overrides>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(regions[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Group regions by page for the tree.
  const grouped = useMemo(() => {
    const m = new Map<string, LiveEditRegionDef[]>();
    for (const r of regions) {
      const list = m.get(r.page) ?? [];
      list.push(r);
      m.set(r.page, list);
    }
    return Array.from(m.entries());
  }, [regions]);

  const selectedRegion = useMemo(
    () => (selectedId ? regions.find((r) => r.id === selectedId) ?? null : null),
    [regions, selectedId]
  );

  // Whether `draft` differs from `persisted` (drives the Save button state).
  const dirty = useMemo(() => !sameOverrides(draft, persisted), [draft, persisted]);

  // Set the edit-mode cookie before the iframe loads so the overlay script
  // injected into the public layout activates. Cleared on unmount so a stray
  // tab opened later doesn't keep the overlay enabled.
  useEffect(() => {
    document.cookie = "toppack_edit_mode=1; path=/; SameSite=Lax";
    return () => {
      document.cookie = "toppack_edit_mode=; path=/; Max-Age=0; SameSite=Lax";
    };
  }, []);

  // Receive selection events from the iframe overlay.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; id?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type === "toppack:select" && typeof data.id === "string") {
        if (regions.some((r) => r.id === data.id)) setSelectedId(data.id);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [regions]);

  // Push selection back to the iframe so it highlights the matching element
  // when the admin picks one from the tree.
  useEffect(() => {
    if (!selectedId) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        { type: "toppack:highlight", id: selectedId },
        window.location.origin
      );
    } catch {
      /* ignore */
    }
  }, [selectedId, iframeKey]);

  function setFieldValue(regionId: string, key: string, value: LiveEditFieldValue | undefined) {
    setError(null);
    setSuccess(null);
    setDraft((prev) => {
      const next: Overrides = { ...prev };
      const region = { ...(next[regionId] ?? {}) };
      if (value === undefined) {
        delete region[key];
      } else {
        region[key] = value;
      }
      if (Object.keys(region).length === 0) {
        delete next[regionId];
      } else {
        next[regionId] = region;
      }
      return next;
    });
  }

  function resetRegion(regionId: string) {
    setError(null);
    setSuccess(null);
    setDraft((prev) => {
      if (!prev[regionId]) return prev;
      const next = { ...prev };
      delete next[regionId];
      return next;
    });
  }

  function discardChanges() {
    setDraft(persisted);
    setError(null);
    setSuccess(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/settings/live-edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveEdits: draft }),
      });
      const json = await readJsonOrSignOut<{ liveEdits: Overrides }>(res);
      setPersisted(json.liveEdits ?? {});
      setDraft(json.liveEdits ?? {});
      setSuccess("Modifications enregistrées.");
      setIframeKey((k) => k + 1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-kraft-50">
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-kraft-200">
        <h1 className="font-semibold text-kraft-900">Édition en direct</h1>
        <span className="text-xs text-kraft-600 hidden sm:inline">
          Cliquez un élément dans l&apos;aperçu pour le modifier.
        </span>
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-700 hidden md:inline">
              Modifications non enregistrées
            </span>
          )}
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={discardChanges}
            disabled={!dirty || saving}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={save}
            disabled={!dirty || saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className="px-4 py-2 bg-white border-b border-kraft-200">
          {error && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{error}</div>}
          {success && (
            <div className="bg-green-50 text-green-700 p-2 rounded text-sm">{success}</div>
          )}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-0">
        <div className="bg-white border-r border-kraft-200 min-h-[400px]">
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src="/"
            title="Aperçu du site"
            className="w-full h-full block"
          />
        </div>
        <div className="overflow-y-auto bg-white border-t lg:border-t-0 border-kraft-200">
          <RegionTree
            grouped={grouped}
            selectedId={selectedId}
            onSelect={setSelectedId}
            draft={draft}
          />
          {selectedRegion ? (
            <PropertyPanel
              region={selectedRegion}
              values={draft[selectedRegion.id] ?? {}}
              onChange={setFieldValue}
              onReset={() => resetRegion(selectedRegion.id)}
            />
          ) : (
            <div className="p-4 text-sm text-kraft-700">
              Sélectionnez un élément à modifier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Region tree
// ---------------------------------------------------------------------------

const PAGE_LABELS: Record<string, string> = {
  home: "Page d'accueil",
};

function pageLabel(page: string): string {
  return PAGE_LABELS[page] ?? page;
}

function RegionTree({
  grouped,
  selectedId,
  onSelect,
  draft,
}: {
  grouped: [string, LiveEditRegionDef[]][];
  selectedId: string | null;
  onSelect: (id: string) => void;
  draft: Overrides;
}) {
  return (
    <div className="border-b border-kraft-200 p-3 space-y-3">
      {grouped.map(([page, list]) => (
        <div key={page}>
          <div className="text-xs font-semibold uppercase tracking-wide text-kraft-600 mb-1">
            {pageLabel(page)}
          </div>
          <ul className="space-y-1">
            {list.map((r) => {
              const active = selectedId === r.id;
              const modified = draft[r.id] && Object.keys(draft[r.id]).length > 0;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                      active
                        ? "bg-kraft-700 text-white"
                        : "text-kraft-800 hover:bg-kraft-100"
                    }`}
                  >
                    <span className="flex-1 truncate">{r.label}</span>
                    {modified && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          active ? "bg-white" : "bg-amber-500"
                        }`}
                        aria-label="Modifié"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Property panel
// ---------------------------------------------------------------------------

function PropertyPanel({
  region,
  values,
  onChange,
  onReset,
}: {
  region: LiveEditRegionDef;
  values: Record<string, LiveEditFieldValue>;
  onChange: (regionId: string, key: string, value: LiveEditFieldValue | undefined) => void;
  onReset: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-semibold text-kraft-900">{region.label}</h2>
        {region.description && (
          <p className="text-xs text-kraft-700 mt-1">{region.description}</p>
        )}
        <p className="text-[10px] text-kraft-500 mt-1 font-mono">{region.id}</p>
      </div>
      <div className="space-y-3">
        {region.fields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => onChange(region.id, field.key, v)}
          />
        ))}
      </div>
      <div className="pt-2 border-t border-kraft-200">
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={onReset}
          disabled={Object.keys(values).length === 0}
        >
          Réinitialiser ce bloc
        </button>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: LiveEditFieldDef;
  value: LiveEditFieldValue | undefined;
  onChange: (value: LiveEditFieldValue | undefined) => void;
}) {
  const isOverridden = value !== undefined;
  const effective: LiveEditFieldValue = value !== undefined ? value : field.default;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="label text-sm">{field.label}</label>
        {isOverridden && (
          <button
            type="button"
            className="text-[11px] text-kraft-700 hover:text-kraft-900 underline"
            onClick={() => onChange(undefined)}
          >
            Par défaut
          </button>
        )}
      </div>
      <FieldInput field={field} value={effective} onChange={onChange} />
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: LiveEditFieldDef;
  value: LiveEditFieldValue;
  onChange: (value: LiveEditFieldValue | undefined) => void;
}) {
  switch (field.type) {
    case "text": {
      const v = typeof value === "string" ? value : "";
      const rows = field.rows ?? 2;
      return (
        <textarea
          className="textarea text-sm"
          rows={rows}
          maxLength={field.maxLength ?? 500}
          value={v}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next === field.default ? undefined : next);
          }}
        />
      );
    }
    case "href": {
      const v = typeof value === "string" ? value : "";
      const valid = !v || isSafeAssetUrl(v);
      return (
        <div>
          <input
            type="text"
            className="input text-sm"
            maxLength={field.maxLength ?? 500}
            value={v}
            placeholder="/page ou https://…"
            onChange={(e) => {
              const next = e.target.value;
              onChange(next === field.default ? undefined : next);
            }}
          />
          {!valid && (
            <p className="text-xs text-red-700 mt-1">
              Lien invalide (utilisez un chemin commençant par « / » ou une URL https).
            </p>
          )}
        </div>
      );
    }
    case "color": {
      const v = typeof value === "string" && HEX_COLOR_RE.test(value) ? value : field.default;
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={v}
            className="h-9 w-12 border border-kraft-300 rounded cursor-pointer"
            onChange={(e) => {
              const next = e.target.value;
              onChange(next === field.default ? undefined : next);
            }}
          />
          <input
            type="text"
            className="input text-sm flex-1 font-mono"
            value={typeof value === "string" ? value : field.default}
            maxLength={7}
            onChange={(e) => {
              const next = e.target.value;
              if (HEX_COLOR_RE.test(next) || next === "") {
                onChange(next && next !== field.default ? next : undefined);
              }
            }}
          />
        </div>
      );
    }
    case "number": {
      const v = typeof value === "number" ? value : field.default;
      const min = field.min ?? 0;
      const max = field.max ?? 1000;
      const step = field.step ?? 1;
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={v}
            className="flex-1"
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(n === field.default ? undefined : n);
            }}
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={v}
            className="input text-sm w-20"
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) {
                onChange(n === field.default ? undefined : n);
              }
            }}
          />
          {field.unit && <span className="text-xs text-kraft-700">{field.unit}</span>}
        </div>
      );
    }
    case "select": {
      const v = typeof value === "string" ? value : field.default;
      return (
        <select
          className="input text-sm"
          value={v}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next === field.default ? undefined : next);
          }}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sameOverrides(a: Overrides, b: Overrides): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    const av = a[k];
    const bv = b[k];
    if (!bv) return false;
    const akeys = Object.keys(av);
    const bkeys = Object.keys(bv);
    if (akeys.length !== bkeys.length) return false;
    for (const fk of akeys) {
      if (av[fk] !== bv[fk]) return false;
    }
  }
  return true;
}
