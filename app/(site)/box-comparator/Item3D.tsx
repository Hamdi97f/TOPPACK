"use client";

import type { CSSProperties } from "react";
import type { ItemPreset } from "@/lib/box-comparator-data";

/**
 * Shape-specific 3D renderers for the box comparator. Every renderer draws
 * the item inside a bounding box of (l × w × h) millimetres centred at the
 * origin of its parent transform. All sizes received here are already in
 * pixels (the caller converts mm→px via the `scale` factor).
 *
 * The rendering uses pure CSS 3D transforms (no WebGL). For cylinders and
 * spheres we approximate the surface with a small number of flat quads so
 * the result still looks recognisably "round" without dragging in a 3D
 * library.
 */

interface ShapeProps {
  /** Pixel dimensions of the bounding box (already includes the zoom). */
  lpx: number;
  wpx: number;
  hpx: number;
  /** Orientation flags from the packing solver. The shape natively assumes
   *  its main axis runs along H (height); when packed sideways the renderer
   *  rotates the whole item to match. */
  orientation: { l: number; w: number; h: number };
  /** Original (un-oriented) preset, used for colours and shape style. */
  preset: ItemPreset;
}

export function Item3D({ lpx, wpx, hpx, orientation, preset }: ShapeProps) {
  // Detect which axis of the rendered bounding box currently corresponds to
  // the preset's "tall" axis. The preset's natural orientation is l=length,
  // w=width, h=height (h being the vertical axis for cylinders/devices).
  // We compare orientation.{l,w,h} against the preset to figure out the
  // rotation that brings the natural axis back to vertical.
  const rotation = computeRotation(preset, orientation);

  const wrapper: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    transformStyle: "preserve-3d",
    transform: rotation,
    pointerEvents: "none",
  };

  // After rotation, lpx/wpx/hpx are the bounding box of the *rendered*
  // item, but the shape renderer wants to think in its own natural frame.
  // We compute the natural-frame dimensions:
  const nat = naturalDims(preset, { l: lpx, w: wpx, h: hpx }, orientation);

  return (
    <div style={wrapper}>
      {renderShape(preset, nat)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rotation helpers
// ---------------------------------------------------------------------------

function computeRotation(
  preset: ItemPreset,
  o: { l: number; w: number; h: number },
): string {
  // The shape renderers draw the item with its natural-h axis along the
  // local CSS Y axis (vertical). When the packer chooses an orientation
  // where preset.h is mapped to a different world axis we rotate the whole
  // item to bring its natural axis back in line with that world axis.
  //   - rotateZ(90deg) swaps CSS X ↔ Y → puts the natural-h axis along
  //     the world's L (length / CSS X) direction.
  //   - rotateX(90deg) swaps CSS Y ↔ Z → puts the natural-h axis along
  //     the world's W (depth / CSS Z) direction.
  // (rotateY would spin the item around its own vertical axis and would
  // therefore have no effect on a cylinder/sphere — it is not what we want.)
  const eq = (a: number, b: number) => Math.abs(a - b) < 0.01;
  if (eq(o.h, preset.h)) return "translate3d(0,0,0)";              // upright
  if (eq(o.l, preset.h)) return "rotateZ(90deg)";                   // lying along X
  if (eq(o.w, preset.h)) return "rotateX(90deg)";                   // lying along Z (depth)
  return "translate3d(0,0,0)";
}

function naturalDims(
  preset: ItemPreset,
  rendered: { l: number; w: number; h: number },
  o: { l: number; w: number; h: number },
): { l: number; w: number; h: number } {
  // After rotation the renderer always works in (l_nat, w_nat, h_nat) space
  // matching the preset's own (preset.l, preset.w, preset.h). We compute the
  // pixel scale per orientation axis then translate to natural axes.
  const sl = rendered.l / o.l;
  const sw = rendered.w / o.w;
  const sh = rendered.h / o.h;
  // The pixel scale is uniform (same mm→px factor in all 3 axes) so any of
  // the three is equal — pick the average to be safe against rounding.
  const s = (sl + sw + sh) / 3;
  return { l: preset.l * s, w: preset.w * s, h: preset.h * s };
}

// ---------------------------------------------------------------------------
// Shape dispatcher
// ---------------------------------------------------------------------------

function renderShape(preset: ItemPreset, nat: { l: number; w: number; h: number }) {
  switch (preset.shape) {
    case "bottle":
      return <Bottle l={nat.l} w={nat.w} h={nat.h} body={preset.color} cap={preset.accent ?? "#1d4ed8"} />;
    case "can":
      return <Can l={nat.l} w={nat.w} h={nat.h} body={preset.color} top={preset.accent ?? "#9ca3af"} />;
    case "mug":
      return <Mug l={nat.l} w={nat.w} h={nat.h} body={preset.color} handle={preset.accent ?? "#f472b6"} />;
    case "sphere":
      return <Sphere l={nat.l} w={nat.w} h={nat.h} body={preset.color} seam={preset.accent ?? "#ffffff"} />;
    case "smartphone":
      return <Smartphone l={nat.l} w={nat.w} h={nat.h} body={preset.color} screen={preset.accent ?? "#1e3a8a"} />;
    case "laptop":
      return <Laptop l={nat.l} w={nat.w} h={nat.h} body={preset.color} screen={preset.accent ?? "#0f172a"} />;
    case "book":
      return <Book l={nat.l} w={nat.w} h={nat.h} cover={preset.color} spine={preset.accent ?? "#065f46"} />;
    case "ream":
      return <Ream l={nat.l} w={nat.w} h={nat.h} paper={preset.color} band={preset.accent ?? "#f59e0b"} />;
    case "sheet":
      return <Sheet l={nat.l} w={nat.w} h={nat.h} color={preset.color} />;
    case "shoebox":
    default:
      return <Cuboid lpx={nat.l} wpx={nat.w} hpx={nat.h} color={preset.color} />;
  }
}

// ---------------------------------------------------------------------------
// Reusable cuboid (for boxy items and as a building block)
// ---------------------------------------------------------------------------

interface CuboidProps {
  lpx: number;
  wpx: number;
  hpx: number;
  color: string;
  /** Optional per-face overrides (CSS background). */
  faces?: Partial<Record<"front" | "back" | "left" | "right" | "top" | "bottom", string>>;
  /** Border radius applied to every face (in px). */
  radius?: number;
}

function Cuboid({ lpx, wpx, hpx, color, faces, radius = 0 }: CuboidProps) {
  const half = { l: lpx / 2, w: wpx / 2, h: hpx / 2 };
  const baseFace = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    background: color,
    border: "1px solid rgba(0,0,0,0.18)",
    boxSizing: "border-box",
    borderRadius: radius,
    ...extra,
  });
  const shade = (alpha: number): CSSProperties => ({
    boxShadow: `inset 0 0 0 9999px rgba(0,0,0,${alpha})`,
  });
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      <div style={{ ...baseFace({}), ...shade(0), background: faces?.front ?? color, width: lpx, height: hpx, left: -half.l, top: -half.h, transform: `translateZ(${half.w}px)` }} />
      <div style={{ ...baseFace({}), ...shade(0.25), background: faces?.back ?? color, width: lpx, height: hpx, left: -half.l, top: -half.h, transform: `rotateY(180deg) translateZ(${half.w}px)` }} />
      <div style={{ ...baseFace({}), ...shade(0.12), background: faces?.right ?? color, width: wpx, height: hpx, left: -half.w, top: -half.h, transform: `rotateY(90deg) translateZ(${half.l}px)` }} />
      <div style={{ ...baseFace({}), ...shade(0.18), background: faces?.left ?? color, width: wpx, height: hpx, left: -half.w, top: -half.h, transform: `rotateY(-90deg) translateZ(${half.l}px)` }} />
      <div style={{ ...baseFace({}), ...shade(0.05), background: faces?.top ?? color, width: lpx, height: wpx, left: -half.l, top: -half.w, transform: `rotateX(-90deg) translateZ(${half.h}px)` }} />
      <div style={{ ...baseFace({}), ...shade(0.3), background: faces?.bottom ?? color, width: lpx, height: wpx, left: -half.l, top: -half.w, transform: `rotateX(90deg) translateZ(${half.h}px)` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cylinder primitive (N-gon prism approximating a circle)
// ---------------------------------------------------------------------------

interface CylinderProps {
  /** Pixel diameter of the cylinder. */
  diameter: number;
  /** Pixel height of the cylinder. */
  height: number;
  body: string;
  /** Number of sides for the prism approximation (default 16). */
  sides?: number;
  topColor?: string;
  bottomColor?: string;
}

function Cylinder({ diameter, height, body, sides = 16, topColor, bottomColor }: CylinderProps) {
  const r = diameter / 2;
  // Inscribed n-gon: each side has width 2r·sin(π/n) and sits at distance
  // r·cos(π/n) from the centre.
  const sideW = 2 * r * Math.sin(Math.PI / sides);
  const sideR = r * Math.cos(Math.PI / sides);
  const faces = [];
  for (let i = 0; i < sides; i++) {
    const angle = (360 / sides) * i;
    // Lambertian-ish shading: faces facing "front" (angle≈0) are brightest.
    const lit = (Math.cos((angle * Math.PI) / 180) + 1) / 2; // 0..1
    const dark = 0.05 + 0.35 * (1 - lit);
    faces.push(
      <div
        key={i}
        style={{
          position: "absolute",
          width: sideW + 0.5,
          height,
          left: -sideW / 2,
          top: -height / 2,
          background: body,
          boxShadow: `inset 0 0 0 9999px rgba(0,0,0,${dark.toFixed(3)})`,
          transform: `rotateY(${angle}deg) translateZ(${sideR}px)`,
          transformOrigin: "50% 50%",
        }}
      />,
    );
  }
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      {faces}
      {/* Top disc */}
      <div
        style={{
          position: "absolute",
          width: diameter,
          height: diameter,
          left: -r,
          top: -r,
          borderRadius: "50%",
          background: topColor ?? body,
          boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.05)",
          transform: `rotateX(-90deg) translateZ(${height / 2}px)`,
        }}
      />
      {/* Bottom disc */}
      <div
        style={{
          position: "absolute",
          width: diameter,
          height: diameter,
          left: -r,
          top: -r,
          borderRadius: "50%",
          background: bottomColor ?? body,
          boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.3)",
          transform: `rotateX(90deg) translateZ(${height / 2}px)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottle = body cylinder + neck cylinder + cap cylinder
// ---------------------------------------------------------------------------

function Bottle({ l, w, h, body, cap }: { l: number; w: number; h: number; body: string; cap: string }) {
  const diameter = Math.min(l, w);
  // Heuristic proportions: 70% body, 12% shoulder taper (rendered as a
  // smaller cylinder), 6% neck, 6% cap.
  const bodyH = h * 0.7;
  const shoulderH = h * 0.12;
  const neckH = h * 0.1;
  const capH = h * 0.08;
  const neckD = diameter * 0.45;
  const shoulderD = diameter * 0.75;
  const capD = diameter * 0.5;
  const yBody = -h / 2 + bodyH / 2;
  const yShoulder = yBody + bodyH / 2 + shoulderH / 2;
  const yNeck = yShoulder + shoulderH / 2 + neckH / 2;
  const yCap = yNeck + neckH / 2 + capH / 2;
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      <div style={{ position: "absolute", transform: `translateY(${-yBody}px)`, transformStyle: "preserve-3d" }}>
        <Cylinder diameter={diameter} height={bodyH} body={body} sides={20} />
      </div>
      <div style={{ position: "absolute", transform: `translateY(${-yShoulder}px)`, transformStyle: "preserve-3d" }}>
        <Cylinder diameter={shoulderD} height={shoulderH} body={body} sides={16} />
      </div>
      <div style={{ position: "absolute", transform: `translateY(${-yNeck}px)`, transformStyle: "preserve-3d" }}>
        <Cylinder diameter={neckD} height={neckH} body={body} sides={14} />
      </div>
      <div style={{ position: "absolute", transform: `translateY(${-yCap}px)`, transformStyle: "preserve-3d" }}>
        <Cylinder diameter={capD} height={capH} body={cap} sides={14} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aluminium can
// ---------------------------------------------------------------------------

function Can({ l, w, h, body, top }: { l: number; w: number; h: number; body: string; top: string }) {
  const diameter = Math.min(l, w);
  const rimH = h * 0.06;
  const bodyH = h - 2 * rimH;
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      <div style={{ position: "absolute", transform: `translateY(${rimH}px)`, transformStyle: "preserve-3d" }}>
        <Cylinder diameter={diameter} height={bodyH} body={body} sides={20} topColor={top} bottomColor={top} />
      </div>
      <div style={{ position: "absolute", transform: `translateY(${-h / 2 + rimH / 2}px)`, transformStyle: "preserve-3d" }}>
        <Cylinder diameter={diameter * 0.92} height={rimH} body={top} sides={20} />
      </div>
      <div style={{ position: "absolute", transform: `translateY(${h / 2 - rimH / 2}px)`, transformStyle: "preserve-3d" }}>
        <Cylinder diameter={diameter * 0.92} height={rimH} body={top} sides={20} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mug = cylinder + handle (a thin torus-ish ring approximated by a thin box)
// ---------------------------------------------------------------------------

function Mug({ l, w, h, body, handle }: { l: number; w: number; h: number; body: string; handle: string }) {
  const diameter = Math.min(l, w);
  const handleW = diameter * 0.28;
  const handleH = h * 0.55;
  const handleT = diameter * 0.12;
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      <Cylinder diameter={diameter} height={h} body={body} sides={20} topColor="#e5e7eb" />
      {/* Handle: a ring approximated by 4 short bars */}
      <div
        style={{
          position: "absolute",
          width: handleT,
          height: handleH,
          left: -handleT / 2,
          top: -handleH / 2,
          background: handle,
          borderRadius: handleT,
          boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.18)",
          transform: `translateX(${diameter / 2 + handleW / 2}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: handleW,
          height: handleT,
          left: -handleW / 2,
          top: -handleT / 2,
          background: handle,
          borderRadius: handleT,
          boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.18)",
          transform: `translate(${diameter / 2 + handleW / 2 - handleW / 2}px, ${-handleH / 2 + handleT / 2}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: handleW,
          height: handleT,
          left: -handleW / 2,
          top: -handleT / 2,
          background: handle,
          borderRadius: handleT,
          boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.18)",
          transform: `translate(${diameter / 2 + handleW / 2 - handleW / 2}px, ${handleH / 2 - handleT / 2}px)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sphere (low-poly stacked discs)
// ---------------------------------------------------------------------------

function Sphere({ l, w, h, body, seam }: { l: number; w: number; h: number; body: string; seam: string }) {
  const r = Math.min(l, w, h) / 2;
  const slices = 9; // odd => one disc at the equator
  const discs = [];
  for (let i = 0; i < slices; i++) {
    const t = (i + 0.5) / slices;          // 0..1
    const y = -r + t * 2 * r;               // -r..r
    const dr = Math.sqrt(Math.max(0, r * r - y * y));
    const d = dr * 2;
    if (d < 1) continue;
    discs.push(
      <div
        key={i}
        style={{
          position: "absolute",
          width: d,
          height: d,
          left: -dr,
          top: -dr,
          borderRadius: "50%",
          background: body,
          boxShadow: `inset ${-dr / 4}px ${-dr / 4}px ${dr}px rgba(0,0,0,0.35), inset ${dr / 6}px ${dr / 6}px ${dr / 2}px rgba(255,255,255,0.25)`,
          transform: `rotateX(-90deg) translateZ(${y}px)`,
        }}
      />,
    );
  }
  // Equator seam (visible from front and side)
  const seamRing = (rotY: number) => (
    <div
      key={`seam-${rotY}`}
      style={{
        position: "absolute",
        width: r * 2,
        height: r * 2,
        left: -r,
        top: -r,
        borderRadius: "50%",
        border: `${Math.max(1, r * 0.05)}px solid ${seam}`,
        background: "transparent",
        opacity: 0.7,
        transform: `rotateY(${rotY}deg)`,
      }}
    />
  );
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      {discs}
      {seamRing(0)}
      {seamRing(90)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Smartphone (thin box + screen face)
// ---------------------------------------------------------------------------

function Smartphone({ l, w, h, body, screen }: { l: number; w: number; h: number; body: string; screen: string }) {
  // The phone is thin along `h`. Its "screen" therefore lives on the large
  // face perpendicular to `h` (i.e. the top face of the bounding box).
  const bezel = Math.min(l, w) * 0.04;
  const screenGradient = `linear-gradient(135deg, ${screen} 0%, #0ea5e9 100%)`;
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      <Cuboid
        lpx={l}
        wpx={w}
        hpx={h}
        color={body}
        radius={Math.min(l, w) * 0.08}
      />
      {/* Screen overlay on the top face (l × w, perpendicular to thickness h) */}
      <div
        style={{
          position: "absolute",
          width: l - bezel * 2,
          height: w - bezel * 2,
          left: -(l - bezel * 2) / 2,
          top: -(w - bezel * 2) / 2,
          background: screenGradient,
          borderRadius: Math.min(l, w) * 0.06,
          boxShadow: "inset 0 0 12px rgba(255,255,255,0.2)",
          transform: `rotateX(-90deg) translateZ(${h / 2 + 0.4}px)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Laptop (closed clamshell) — thin box + lid logo accent
// ---------------------------------------------------------------------------

function Laptop({ l, w, h, body, screen }: { l: number; w: number; h: number; body: string; screen: string }) {
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      <Cuboid
        lpx={l}
        wpx={w}
        hpx={h}
        color={body}
        radius={Math.min(l, w) * 0.02}
      />
      {/* Lid accent (small rectangle on the top face) */}
      <div
        style={{
          position: "absolute",
          width: l * 0.3,
          height: w * 0.3,
          left: -l * 0.15,
          top: -w * 0.15,
          background: screen,
          opacity: 0.6,
          borderRadius: 4,
          transform: `rotateX(-90deg) translateZ(${h / 2 + 0.3}px)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Book — cuboid with a coloured spine on the left short face
// ---------------------------------------------------------------------------

function Book({ l, w, h, cover, spine }: { l: number; w: number; h: number; cover: string; spine: string }) {
  // Pages striations on long edges via repeating gradient
  const pages =
    `repeating-linear-gradient(0deg, #fff 0 1px, #f3f4f6 1px 2px)`;
  return (
    <Cuboid
      lpx={l}
      wpx={w}
      hpx={h}
      color={cover}
      radius={1}
      faces={{
        front: cover,
        back: cover,
        // Spine = one of the short edges
        left: spine,
        right: pages,
        top: pages,
        bottom: pages,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Ream of paper — white box wrapped with a coloured band
// ---------------------------------------------------------------------------

function Ream({ l, w, h, paper, band }: { l: number; w: number; h: number; paper: string; band: string }) {
  const pages =
    `repeating-linear-gradient(0deg, #fff 0 1px, #e5e7eb 1px 2px)`;
  return (
    <div style={{ position: "absolute", transformStyle: "preserve-3d" }}>
      <Cuboid
        lpx={l}
        wpx={w}
        hpx={h}
        color={paper}
        faces={{
          front: pages,
          back: pages,
          left: pages,
          right: pages,
          top: paper,
          bottom: paper,
        }}
      />
      {/* Coloured wrapper band on the front and back faces */}
      <div
        style={{
          position: "absolute",
          width: l,
          height: h * 0.45,
          left: -l / 2,
          top: -h * 0.225,
          background: band,
          opacity: 0.85,
          transform: `translateZ(${w / 2 + 0.4}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: l,
          height: h * 0.45,
          left: -l / 2,
          top: -h * 0.225,
          background: band,
          opacity: 0.85,
          transform: `rotateY(180deg) translateZ(${w / 2 + 0.4}px)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// A single sheet of paper (very thin cuboid with paper face)
// ---------------------------------------------------------------------------

function Sheet({ l, w, h, color }: { l: number; w: number; h: number; color: string }) {
  return (
    <Cuboid
      lpx={l}
      wpx={w}
      hpx={Math.max(h, 1)}
      color={color}
      radius={1}
    />
  );
}
