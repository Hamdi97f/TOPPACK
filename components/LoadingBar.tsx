/**
 * Lightweight, CSS-only top progress bar.
 * Used as the Suspense fallback in route-segment `loading.tsx` files so that
 * navigation feels instant while the next page streams in.
 */
export function LoadingBar() {
  return (
    <div
      className="loading-bar"
      role="progressbar"
      aria-busy="true"
      aria-label="Chargement"
    />
  );
}
