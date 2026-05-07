/**
 * Reference data for the public 3D cardboard-box comparator page.
 *
 * All dimensions are expressed in millimetres (mm) and represent the bounding
 * box of the item — for cylindrical items (bottles, cans, mugs) the width and
 * depth are the diameter. The packing logic in the 3D viewer treats every
 * item as an axis-aligned rectangular block, which is a reasonable
 * approximation for "how many fit in a carton" estimates.
 */

export interface ItemPreset {
  id: string;
  /** French label shown in the picker. */
  label: string;
  /** Short description shown next to the label. */
  hint?: string;
  /** Outer dimensions in millimetres: length × width × height. */
  l: number;
  w: number;
  h: number;
  /** Tailwind/CSS colour for the rendered block face. */
  color: string;
  /**
   * Visual style used by the 3D viewer. Determines whether the item is
   * rendered as a box, a cylinder (bottle/can/mug), a sphere, or a more
   * detailed device (smartphone/laptop/book/ream).
   */
  shape:
    | "bottle"
    | "can"
    | "mug"
    | "sphere"
    | "smartphone"
    | "laptop"
    | "book"
    | "ream"
    | "shoebox"
    | "sheet";
  /** Optional secondary colour used by some shapes (cap, screen, spine, …). */
  accent?: string;
}

export interface BoxPreset {
  id: string;
  label: string;
  /** Inner dimensions in millimetres. */
  l: number;
  w: number;
  h: number;
}

export const ITEM_PRESETS: readonly ItemPreset[] = [
  {
    id: "bottle-1-5l",
    label: "Bouteille d'eau 1,5 L",
    hint: "≈ Ø88 × 320 mm",
    l: 88, w: 88, h: 320,
    color: "#60a5fa",
    accent: "#1d4ed8",
    shape: "bottle",
  },
  {
    id: "bottle-50cl",
    label: "Bouteille d'eau 50 cl",
    hint: "≈ Ø65 × 215 mm",
    l: 65, w: 65, h: 215,
    color: "#93c5fd",
    accent: "#1d4ed8",
    shape: "bottle",
  },
  {
    id: "can-33cl",
    label: "Canette 33 cl",
    hint: "≈ Ø66 × 115 mm",
    l: 66, w: 66, h: 115,
    color: "#ef4444",
    accent: "#9ca3af",
    shape: "can",
  },
  {
    id: "ream-a4",
    label: "Rame de papier A4 (500 feuilles)",
    hint: "297 × 210 × 50 mm",
    l: 297, w: 210, h: 50,
    color: "#fef3c7",
    accent: "#f59e0b",
    shape: "ream",
  },
  {
    id: "sheet-a4",
    label: "Feuille A4",
    hint: "297 × 210 × 1 mm",
    l: 297, w: 210, h: 1,
    color: "#fde68a",
    shape: "sheet",
  },
  {
    id: "book-pocket",
    label: "Livre de poche",
    hint: "180 × 110 × 20 mm",
    l: 180, w: 110, h: 20,
    color: "#10b981",
    accent: "#065f46",
    shape: "book",
  },
  {
    id: "shoebox",
    label: "Boîte à chaussures (pointure 42)",
    hint: "330 × 200 × 130 mm",
    l: 330, w: 200, h: 130,
    color: "#a855f7",
    shape: "shoebox",
  },
  {
    id: "smartphone",
    label: "Smartphone",
    hint: "160 × 75 × 8 mm",
    l: 160, w: 75, h: 8,
    color: "#111827",
    accent: "#1e3a8a",
    shape: "smartphone",
  },
  {
    id: "laptop-15",
    label: "Ordinateur portable 15 pouces",
    hint: "360 × 245 × 20 mm",
    l: 360, w: 245, h: 20,
    color: "#374151",
    accent: "#0f172a",
    shape: "laptop",
  },
  {
    id: "mug",
    label: "Mug",
    hint: "≈ Ø95 × 100 mm",
    l: 95, w: 95, h: 100,
    color: "#f9fafb",
    accent: "#f472b6",
    shape: "mug",
  },
  {
    id: "cube-tennis",
    label: "Balle de tennis",
    hint: "≈ Ø67 mm",
    l: 67, w: 67, h: 67,
    color: "#bef264",
    accent: "#ffffff",
    shape: "sphere",
  },
];

export const BOX_PRESETS: readonly BoxPreset[] = [
  { id: "small",  label: "Petit carton",       l: 200, w: 150, h: 100 },
  { id: "medium", label: "Carton moyen",       l: 300, w: 200, h: 150 },
  { id: "large",  label: "Grand carton",       l: 400, w: 300, h: 200 },
  { id: "xl",     label: "Très grand carton",  l: 600, w: 400, h: 300 },
  { id: "cube40", label: "Cube 40 cm",         l: 400, w: 400, h: 400 },
];

/** Hard limits to keep the 3D viewer responsive and prevent abuse. */
export const BOX_DIM_MIN_MM = 10;
export const BOX_DIM_MAX_MM = 2000;
export const ITEM_QTY_MAX = 500;

export function clampDim(value: number): number {
  if (!Number.isFinite(value)) return BOX_DIM_MIN_MM;
  return Math.max(BOX_DIM_MIN_MM, Math.min(BOX_DIM_MAX_MM, Math.round(value)));
}

/**
 * Greedy axis-aligned packing of identical items into a box. Returns the
 * positions (in mm, relative to the box's `(0,0,0)` corner) and the maximum
 * count that fits. The orientation that maximises the count is selected.
 *
 * This is intentionally simple — it lays items out in a regular grid for the
 * chosen orientation. For irregular shapes you'd need a real 3D bin packer,
 * but for the visual comparison we want here a uniform stack is clearer.
 */
export function packItems(
  box: { l: number; w: number; h: number },
  item: { l: number; w: number; h: number },
  desiredQty: number,
): { positions: { x: number; y: number; z: number }[]; orientation: { l: number; w: number; h: number }; maxFit: number } {
  // All 6 axis-aligned orientations of the item.
  const orientations = [
    { l: item.l, w: item.w, h: item.h },
    { l: item.l, w: item.h, h: item.w },
    { l: item.w, w: item.l, h: item.h },
    { l: item.w, w: item.h, h: item.l },
    { l: item.h, w: item.l, h: item.w },
    { l: item.h, w: item.w, h: item.l },
  ];

  let best = {
    orientation: orientations[0],
    nx: 0, ny: 0, nz: 0,
    total: 0,
  };

  for (const o of orientations) {
    const nx = Math.floor(box.l / o.l);
    const ny = Math.floor(box.w / o.w);
    const nz = Math.floor(box.h / o.h);
    const total = nx * ny * nz;
    if (total > best.total) best = { orientation: o, nx, ny, nz, total };
  }

  const cap = Math.min(best.total, Math.max(0, Math.floor(desiredQty)));
  const positions: { x: number; y: number; z: number }[] = [];
  if (cap > 0 && best.total > 0) {
    let placed = 0;
    outer: for (let z = 0; z < best.nz; z++) {
      for (let y = 0; y < best.ny; y++) {
        for (let x = 0; x < best.nx; x++) {
          if (placed >= cap) break outer;
          positions.push({
            x: x * best.orientation.l,
            y: y * best.orientation.w,
            z: z * best.orientation.h,
          });
          placed++;
        }
      }
    }
  }

  return { positions, orientation: best.orientation, maxFit: best.total };
}
