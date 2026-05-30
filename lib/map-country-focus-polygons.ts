import type { CountryBoundaryPolygon } from "@/lib/map-country-boundaries";

/**
 * When a continent overlay sits under the country highlight, polygon holes
 * (lakes, bays) read as empty gaps. Drop holes so the highlight reads solid.
 */
export function resolveCountryFocusRenderPolygons(
  polygons: CountryBoundaryPolygon[],
  fillGapsWhenContinentOverlay: boolean,
): CountryBoundaryPolygon[] {
  if (!fillGapsWhenContinentOverlay) return polygons;

  return polygons.map(({ holes: _holes, ...polygon }) => polygon);
}

/** True when committed or preview continent fills are on screen. */
export function shouldFillCountryHighlightGaps(
  continentOverlayRegion: string | null | undefined,
  previewRegion: string | null | undefined,
): boolean {
  return !!(continentOverlayRegion || previewRegion);
}
