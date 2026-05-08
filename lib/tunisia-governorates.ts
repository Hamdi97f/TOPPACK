/**
 * Canonical list of the 24 Tunisian governorates ("gouvernorats"), in the
 * exact spelling expected by the Mes Colis Express shipping API. The same
 * list is used to populate the "Ville" select in the public checkout form
 * and the admin manual-order form, so customer-supplied values can always
 * be forwarded to the shipping company without normalisation.
 *
 * Order matches the alphabetical order used by Mes Colis Express, with
 * accented characters interleaved as in the API documentation.
 */
export const TUNISIA_GOVERNORATES = [
  "Ariana",
  "Béja",
  "Ben Arous",
  "Bizerte",
  "Gabès",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kébili",
  "La Mannouba",
  "Le Kef",
  "Mahdia",
  "Médenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
] as const;

export type TunisiaGovernorate = (typeof TUNISIA_GOVERNORATES)[number];

export function isTunisiaGovernorate(value: unknown): value is TunisiaGovernorate {
  return (
    typeof value === "string" &&
    (TUNISIA_GOVERNORATES as readonly string[]).includes(value)
  );
}
