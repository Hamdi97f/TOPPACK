/**
 * Live-edit region registry.
 *
 * Each entry declares a stable `id` (used as the storage key in
 * `SiteSettings.liveEdits` and as the `data-edit-id` attribute on the rendered
 * markup), a French human-readable label, the page it belongs to (used to
 * group regions in the admin tree), and a typed schema of the fields whose
 * values the admin may override.
 *
 * The registry is the single source of truth for both:
 *   - the storefront resolver (`getEditable` in `./editable.ts`), which merges
 *     declared defaults ⊕ persisted overrides at render time, and
 *   - the admin editor UI (`/admin/live-edit`), which renders the property
 *     panel from these field descriptors and validates incoming PUT payloads
 *     against the declared shape.
 *
 * Keep field types narrow and bounded — the corresponding values are persisted
 * verbatim and rendered into HTML attributes / inline styles / link hrefs on
 * the public site, so they are part of the security perimeter.
 */

// ---------------------------------------------------------------------------
// Field descriptors
// ---------------------------------------------------------------------------

export type LiveEditFieldType = "text" | "href" | "color" | "number" | "select";

export interface BaseFieldDef<T extends LiveEditFieldType, V> {
  /** Stable key inside the region's overrides record. */
  key: string;
  /** Human-readable French label shown in the admin property panel. */
  label: string;
  /** Field input type — drives admin UI rendering and validation. */
  type: T;
  /** Default value used when no override is set. */
  default: V;
}

export interface TextFieldDef extends BaseFieldDef<"text", string> {
  /** Maximum character count. Strings exceeding the limit are clipped. */
  maxLength?: number;
  /** Render the textarea this many rows tall in the admin UI. */
  rows?: number;
}

export interface HrefFieldDef extends BaseFieldDef<"href", string> {
  maxLength?: number;
}

export type ColorFieldDef = BaseFieldDef<"color", string>;

export interface NumberFieldDef extends BaseFieldDef<"number", number> {
  min?: number;
  max?: number;
  step?: number;
  /** Suffix shown next to the value in the admin UI (e.g. "px", "rem"). */
  unit?: string;
}

export interface SelectFieldDef extends BaseFieldDef<"select", string> {
  options: { value: string; label: string }[];
}

export type LiveEditFieldDef =
  | TextFieldDef
  | HrefFieldDef
  | ColorFieldDef
  | NumberFieldDef
  | SelectFieldDef;

export interface LiveEditRegionDef {
  /** Stable id used as the `data-edit-id` attribute. Must be unique. */
  id: string;
  /** French label shown in the admin tree and property panel header. */
  label: string;
  /** Page slug used to group regions in the admin tree (e.g. "home"). */
  page: string;
  /** Optional French description shown above the property panel. */
  description?: string;
  /** Typed fields that may be overridden for this region. */
  fields: LiveEditFieldDef[];
}

// ---------------------------------------------------------------------------
// Registry — Phase 1: home page regions
// ---------------------------------------------------------------------------

/**
 * Hex color regex used to validate `color` field values. Accepts both `#rgb`
 * and `#rrggbb` forms (case-insensitive). Anything else is dropped at
 * normalisation time so that admin-supplied values can be safely interpolated
 * into an inline `style` attribute on the public site.
 */
export const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const HOME_REGIONS: LiveEditRegionDef[] = [
  {
    id: "home.hero",
    label: "Section héros",
    page: "home",
    description: "Bandeau principal en haut de la page d'accueil.",
    fields: [
      {
        key: "title",
        label: "Titre",
        type: "text",
        maxLength: 200,
        rows: 2,
        default: "Cartons en carton ondulé pour toutes les entreprises",
      },
      {
        key: "subtitle",
        label: "Sous-titre",
        type: "text",
        maxLength: 500,
        rows: 4,
        default:
          "Cartons simple cannelure, double cannelure, enveloppes d'expédition et cartons personnalisés — conçus pour une expédition sécurisée et fabriqués selon vos spécifications.",
      },
      { key: "titleColor", label: "Couleur du titre", type: "color", default: "#3a2a1a" },
      { key: "subtitleColor", label: "Couleur du sous-titre", type: "color", default: "#5a4530" },
      { key: "bgFromColor", label: "Couleur de fond (haut)", type: "color", default: "#f5ead6" },
      { key: "bgToColor", label: "Couleur de fond (bas)", type: "color", default: "#eadab8" },
      {
        key: "paddingY",
        label: "Espacement vertical",
        type: "number",
        min: 0,
        max: 200,
        step: 4,
        unit: "px",
        default: 64,
      },
    ],
  },
  {
    id: "home.hero.ctaPrimary",
    label: "Bouton principal du héros",
    page: "home",
    fields: [
      { key: "label", label: "Libellé", type: "text", maxLength: 80, default: "Acheter des cartons" },
      { key: "href", label: "Lien", type: "href", maxLength: 500, default: "/products" },
    ],
  },
  {
    id: "home.hero.ctaSecondary",
    label: "Bouton secondaire du héros",
    page: "home",
    fields: [
      { key: "label", label: "Libellé", type: "text", maxLength: 80, default: "Demander un devis" },
      { key: "href", label: "Lien", type: "href", maxLength: 500, default: "/devis" },
    ],
  },
  {
    id: "home.values.card1",
    label: "Atout 1",
    page: "home",
    fields: [
      { key: "title", label: "Titre", type: "text", maxLength: 80, default: "Tailles personnalisées" },
      {
        key: "description",
        label: "Description",
        type: "text",
        maxLength: 300,
        rows: 3,
        default: "Fabriqués à vos dimensions exactes et avec la résistance souhaitée.",
      },
    ],
  },
  {
    id: "home.values.card2",
    label: "Atout 2",
    page: "home",
    fields: [
      { key: "title", label: "Titre", type: "text", maxLength: 80, default: "Tarifs en gros" },
      {
        key: "description",
        label: "Description",
        type: "text",
        maxLength: 300,
        rows: 3,
        default: "Remises sur volume pour les entreprises et les revendeurs.",
      },
    ],
  },
  {
    id: "home.values.card3",
    label: "Atout 3",
    page: "home",
    fields: [
      { key: "title", label: "Titre", type: "text", maxLength: 80, default: "Livraison rapide" },
      {
        key: "description",
        label: "Description",
        type: "text",
        maxLength: 300,
        rows: 3,
        default: "La plupart des commandes sont expédiées sous 48 heures depuis notre entrepôt.",
      },
    ],
  },
  {
    id: "home.categories.heading",
    label: "Titre « Acheter par catégorie »",
    page: "home",
    fields: [
      { key: "text", label: "Texte", type: "text", maxLength: 120, default: "Acheter par catégorie" },
      { key: "color", label: "Couleur", type: "color", default: "#3a2a1a" },
      {
        key: "align",
        label: "Alignement",
        type: "select",
        default: "left",
        options: [
          { value: "left", label: "Gauche" },
          { value: "center", label: "Centré" },
          { value: "right", label: "Droite" },
        ],
      },
    ],
  },
  {
    id: "home.featured.heading",
    label: "Titre « Produits mis en avant »",
    page: "home",
    fields: [
      { key: "text", label: "Texte", type: "text", maxLength: 120, default: "Produits mis en avant" },
      { key: "color", label: "Couleur", type: "color", default: "#3a2a1a" },
      {
        key: "align",
        label: "Alignement",
        type: "select",
        default: "left",
        options: [
          { value: "left", label: "Gauche" },
          { value: "center", label: "Centré" },
          { value: "right", label: "Droite" },
        ],
      },
    ],
  },
];

export const LIVE_EDIT_REGIONS: LiveEditRegionDef[] = [...HOME_REGIONS];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const REGISTRY_BY_ID = new Map<string, LiveEditRegionDef>(
  LIVE_EDIT_REGIONS.map((r) => [r.id, r])
);

export function getRegion(id: string): LiveEditRegionDef | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function getField(
  region: LiveEditRegionDef,
  key: string
): LiveEditFieldDef | undefined {
  return region.fields.find((f) => f.key === key);
}

/** Pages declared by at least one region, in the order they were registered. */
export function getRegisteredPages(): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of LIVE_EDIT_REGIONS) {
    if (!seen.has(r.page)) {
      seen.add(r.page);
      order.push(r.page);
    }
  }
  return order;
}

export function getRegionsForPage(page: string): LiveEditRegionDef[] {
  return LIVE_EDIT_REGIONS.filter((r) => r.page === page);
}
