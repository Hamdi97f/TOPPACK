"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BOX_DIM_MAX_MM,
  BOX_DIM_MIN_MM,
  BOX_PRESETS,
  ITEM_PRESETS,
  ITEM_QTY_MAX,
  clampDim,
  packItems,
} from "@/lib/box-comparator-data";

const CUSTOM_PRESET_ID = "__custom__";

/** A single rectangular block in the 3D scene. */
interface SceneBox {
  // Position (centre of the block) in mm relative to the box centre
  cx: number; cy: number; cz: number;
  // Dimensions in mm
  l: number; w: number; h: number;
  // Visual style
  color: string;
  // When true the block is rendered as a transparent wireframe (the carton)
  wireframe: boolean;
  // When true the block uses cylinder-ish shading (rounded ends faces)
  rounded?: boolean;
}

/**
 * Public, hideable 3D box-vs-items comparator. Rendered with CSS 3D transforms
 * so it works without any WebGL/three.js dependency. The user can drag to
 * rotate the camera and use the mouse wheel (or pinch gesture on touch
 * devices) to zoom.
 */
export function BoxComparatorClient() {
  // -- Box selection --------------------------------------------------------
  const [boxPresetId, setBoxPresetId] = useState<string>(BOX_PRESETS[1].id);
  const presetBox = useMemo(
    () => BOX_PRESETS.find((p) => p.id === boxPresetId),
    [boxPresetId],
  );
  const [customL, setCustomL] = useState<number>(BOX_PRESETS[1].l);
  const [customW, setCustomW] = useState<number>(BOX_PRESETS[1].w);
  const [customH, setCustomH] = useState<number>(BOX_PRESETS[1].h);
  // Raw text mirrors of the custom-dim inputs so the user can momentarily
  // clear a field without it snapping to the minimum value.
  const [customLText, setCustomLText] = useState<string>(String(BOX_PRESETS[1].l));
  const [customWText, setCustomWText] = useState<string>(String(BOX_PRESETS[1].w));
  const [customHText, setCustomHText] = useState<string>(String(BOX_PRESETS[1].h));

  const box = useMemo(() => {
    if (presetBox) return { l: presetBox.l, w: presetBox.w, h: presetBox.h };
    return { l: clampDim(customL), w: clampDim(customW), h: clampDim(customH) };
  }, [presetBox, customL, customW, customH]);

  // -- Item selection -------------------------------------------------------
  const [itemId, setItemId] = useState<string>(ITEM_PRESETS[0].id);
  const item = useMemo(
    () => ITEM_PRESETS.find((p) => p.id === itemId) ?? ITEM_PRESETS[0],
    [itemId],
  );
  const [qty, setQty] = useState<number>(1);

  // -- Packing --------------------------------------------------------------
  const packed = useMemo(
    () => packItems(box, { l: item.l, w: item.w, h: item.h }, qty),
    [box, item, qty],
  );

  // Build the scene: the carton (wireframe) + the packed items.
  const scene = useMemo<SceneBox[]>(() => {
    const out: SceneBox[] = [];
    // Carton (wireframe, slight kraft tint)
    out.push({
      cx: 0, cy: 0, cz: 0,
      l: box.l, w: box.w, h: box.h,
      color: "#a16207",
      wireframe: true,
    });
    const half = { l: box.l / 2, w: box.w / 2, h: box.h / 2 };
    const o = packed.orientation;
    for (const p of packed.positions) {
      out.push({
        cx: p.x + o.l / 2 - half.l,
        cy: p.y + o.w / 2 - half.w,
        cz: p.z + o.h / 2 - half.h,
        l: o.l, w: o.w, h: o.h,
        color: item.color,
        wireframe: false,
        rounded: item.id.startsWith("bottle") || item.id === "can-33cl" || item.id === "mug" || item.id === "cube-tennis",
      });
    }
    return out;
  }, [box, packed, item]);

  // -- Camera (rotation + zoom) --------------------------------------------
  const [rotX, setRotX] = useState(-25);
  const [rotY, setRotY] = useState(-30);
  const [zoom, setZoom] = useState(1);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - dragging.current.x;
      const dy = e.clientY - dragging.current.y;
      setRotY(dragging.current.ry + dx * 0.4);
      setRotX(Math.max(-89, Math.min(89, dragging.current.rx + dy * 0.4)));
    }
    function onUp() {
      dragging.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY };
  }
  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    // Use deltaY to zoom; clamp to a sensible range.
    setZoom((z) => Math.max(0.2, Math.min(3, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  }

  // Auto-fit: scale so the largest box dimension occupies ~70% of the
  // viewport's smaller side. The viewport is 480px square at the largest, so
  // the unit-mm-to-px factor is recomputed whenever the box changes.
  const viewportPx = 480;
  const maxDim = Math.max(box.l, box.w, box.h, 100);
  const mmToPx = (viewportPx * 0.65) / maxDim;
  const totalScale = mmToPx * zoom;

  function reset() {
    setRotX(-25);
    setRotY(-30);
    setZoom(1);
  }

  // -- Render ---------------------------------------------------------------
  const fillRatio = box.l && box.w && box.h
    ? Math.min(1, (packed.positions.length * item.l * item.w * item.h) / (box.l * box.w * box.h))
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Controls panel                                                     */}
      {/* ------------------------------------------------------------------ */}
      <aside className="space-y-5">
        <div className="card p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-kraft-900 mb-1" htmlFor="box-preset">
              Carton
            </label>
            <select
              id="box-preset"
              className="w-full border border-kraft-300 rounded px-3 py-2 text-sm"
              value={boxPresetId}
              onChange={(e) => setBoxPresetId(e.target.value)}
            >
              {BOX_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} — {p.l}×{p.w}×{p.h} mm
                </option>
              ))}
              <option value={CUSTOM_PRESET_ID}>Dimensions personnalisées…</option>
            </select>
          </div>

          {!presetBox && (
            <div className="grid grid-cols-3 gap-2">
              {([
                ["L", customLText, setCustomL, setCustomLText],
                ["l", customWText, setCustomW, setCustomWText],
                ["H", customHText, setCustomH, setCustomHText],
              ] as const).map(([label, text, setNum, setText]) => (
                <label key={label} className="text-xs text-kraft-700 block">
                  <span className="block mb-1">{label} (mm)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={BOX_DIM_MIN_MM}
                    max={BOX_DIM_MAX_MM}
                    step={1}
                    className="w-full border border-kraft-300 rounded px-2 py-1.5 text-sm"
                    value={text}
                    onChange={(e) => {
                      const next = e.target.value;
                      setText(next);
                      const parsed = parseFloat(next);
                      // Only commit a numeric value to the model when one was
                      // actually typed; an empty field keeps the previous
                      // dimension so the 3D scene doesn't collapse.
                      if (Number.isFinite(parsed)) setNum(clampDim(parsed));
                    }}
                    onBlur={() => {
                      // Snap the text back to the committed numeric value when
                      // the user leaves the field (e.g. after clearing it).
                      const committed =
                        label === "L" ? customL : label === "l" ? customW : customH;
                      setText(String(committed));
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-kraft-900 mb-1" htmlFor="item-preset">
              Objet à comparer
            </label>
            <select
              id="item-preset"
              className="w-full border border-kraft-300 rounded px-3 py-2 text-sm"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              {ITEM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {item.hint && (
              <p className="mt-1 text-xs text-kraft-600">{item.hint}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-kraft-900 mb-1" htmlFor="item-qty">
              Quantité affichée
            </label>
            <div className="flex items-center gap-2">
              <input
                id="item-qty"
                type="range"
                min={1}
                max={Math.max(1, Math.min(packed.maxFit || 1, ITEM_QTY_MAX))}
                step={1}
                value={Math.min(qty, packed.maxFit || 1)}
                onChange={(e) => setQty(parseInt(e.target.value, 10))}
                className="flex-1"
                disabled={packed.maxFit === 0}
              />
              <span className="w-16 text-right text-sm tabular-nums">
                {Math.min(qty, packed.maxFit)} / {packed.maxFit}
              </span>
            </div>
            <p className="mt-1 text-xs text-kraft-600">
              {packed.maxFit === 0
                ? "L'objet ne rentre pas dans ce carton."
                : `Capacité maximale : ${packed.maxFit} ${packed.maxFit > 1 ? "exemplaires" : "exemplaire"}.`}
            </p>
          </div>
        </div>

        <div className="card p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-kraft-700">Volume du carton</span>
            <span className="font-medium tabular-nums">
              {((box.l * box.w * box.h) / 1_000_000).toFixed(2)} L
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-kraft-700">Volume de l&apos;objet</span>
            <span className="font-medium tabular-nums">
              {((item.l * item.w * item.h) / 1_000_000).toFixed(3)} L
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-kraft-700">Remplissage</span>
            <span className="font-medium tabular-nums">{Math.round(fillRatio * 100)}%</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={reset} className="btn-secondary !py-1.5 !px-3 text-sm">
            Réinitialiser la vue
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* 3D viewport                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-2 sm:p-4">
        <div
          ref={sceneRef}
          onPointerDown={onPointerDown}
          onWheel={onWheel}
          className="relative mx-auto select-none touch-none cursor-grab active:cursor-grabbing bg-gradient-to-b from-sky-50 to-kraft-100 rounded overflow-hidden"
          style={{
            width: "100%",
            maxWidth: viewportPx,
            aspectRatio: "1 / 1",
            perspective: "1400px",
          }}
          aria-label="Vue 3D : faites glisser pour pivoter, molette pour zoomer"
          role="img"
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transform: `translate3d(50%, 50%, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
              transformOrigin: "0 0",
            }}
          >
            {/* Floor grid for depth perception. Sits just below the carton's
                bottom face. CSS +Y is downward so the floor goes at +H/2. */}
            <div
              style={{
                position: "absolute",
                width: viewportPx,
                height: viewportPx,
                left: -viewportPx / 2,
                top: -viewportPx / 2,
                transform: `rotateX(90deg) translateZ(${(box.h / 2) * totalScale + 1}px)`,
                background:
                  "repeating-linear-gradient(0deg, rgba(120,90,40,0.18) 0 1px, transparent 1px 40px), " +
                  "repeating-linear-gradient(90deg, rgba(120,90,40,0.18) 0 1px, transparent 1px 40px)",
                borderRadius: 4,
                pointerEvents: "none",
              }}
            />
            {scene.map((b, i) => (
              <Box3D key={i} box={b} scale={totalScale} />
            ))}
          </div>
          <div className="absolute bottom-2 left-2 right-2 text-[11px] text-kraft-700/80 pointer-events-none">
            Glissez pour pivoter · molette pour zoomer
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a single rectangular block (or wireframe carton) using six
 * absolutely-positioned faces inside a `transform-style: preserve-3d` parent.
 */
function Box3D({ box, scale }: { box: SceneBox; scale: number }) {
  const lpx = box.l * scale;
  const wpx = box.w * scale;
  const hpx = box.h * scale;

  // Faces are positioned relative to the box centre.
  const half = { l: lpx / 2, w: wpx / 2, h: hpx / 2 };

  const faceBase: React.CSSProperties = box.wireframe
    ? {
        background: "rgba(161, 98, 7, 0.06)",
        border: "1.5px dashed #a16207",
        boxSizing: "border-box",
      }
    : {
        background: box.color,
        border: "1px solid rgba(0,0,0,0.25)",
        boxSizing: "border-box",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
        borderRadius: box.rounded ? 4 : 0,
      };

  // Tint each face slightly differently for shading.
  const shade = (alpha: number): React.CSSProperties =>
    box.wireframe
      ? {}
      : { boxShadow: `inset 0 0 0 9999px rgba(0,0,0,${alpha})` };

  const wrapper: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    transformStyle: "preserve-3d",
    // Coordinate remap from box space to CSS 3D screen space:
    //   cx (length axis) → screen X
    //   cz (height axis) → screen Y inverted (CSS +Y is downward, so up is -Y)
    //   cy (depth axis)  → screen Z (into the screen)
    transform: `translate3d(${box.cx * scale}px, ${box.cz * scale * -1}px, ${box.cy * scale}px)`,
    pointerEvents: "none",
  };

  return (
    <div style={wrapper}>
      {/* Front (+Z) */}
      <div
        style={{
          ...faceBase, ...shade(0.0),
          position: "absolute",
          width: lpx, height: hpx,
          left: -half.l, top: -half.h,
          transform: `translateZ(${half.w}px)`,
        }}
      />
      {/* Back (-Z) */}
      <div
        style={{
          ...faceBase, ...shade(0.25),
          position: "absolute",
          width: lpx, height: hpx,
          left: -half.l, top: -half.h,
          transform: `rotateY(180deg) translateZ(${half.w}px)`,
        }}
      />
      {/* Right (+X) */}
      <div
        style={{
          ...faceBase, ...shade(0.12),
          position: "absolute",
          width: wpx, height: hpx,
          left: -half.w, top: -half.h,
          transform: `rotateY(90deg) translateZ(${half.l}px)`,
        }}
      />
      {/* Left (-X) */}
      <div
        style={{
          ...faceBase, ...shade(0.18),
          position: "absolute",
          width: wpx, height: hpx,
          left: -half.w, top: -half.h,
          transform: `rotateY(-90deg) translateZ(${half.l}px)`,
        }}
      />
      {/* Top of the box (rendered upward — note CSS +Y is down, so we use
          rotateX(-90deg) to make the face point up). */}
      <div
        style={{
          ...faceBase, ...shade(0.05),
          position: "absolute",
          width: lpx, height: wpx,
          left: -half.l, top: -half.w,
          transform: `rotateX(-90deg) translateZ(${half.h}px)`,
        }}
      />
      {/* Bottom of the box. */}
      <div
        style={{
          ...faceBase, ...shade(0.3),
          position: "absolute",
          width: lpx, height: wpx,
          left: -half.l, top: -half.w,
          transform: `rotateX(90deg) translateZ(${half.h}px)`,
        }}
      />
    </div>
  );
}
