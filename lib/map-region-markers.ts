import type { MapCountry } from "@/types/country";

/** Flag pins shown at continent/region zoom — zoom in to reveal the rest. */
export const REGION_ZOOM_MARKER_CAP = 16;

/** Below this latitudeDelta (2D), show every filtered country in the focused region. */
export const MAP_COUNTRY_ZOOM_LATITUDE_DELTA = 28;
/** Cluster focus lands here; any zoom-in movement beyond this reveals all flags. */
export const REGION_FOCUS_INITIAL_DELTA = 45;

/** Keeps the most populous countries for a lighter region-level discovery view. */
export function capMapCountriesByPopulation(
  countries: MapCountry[],
  limit = REGION_ZOOM_MARKER_CAP,
): MapCountry[] {
  if (countries.length <= limit) return countries;

  return [...countries]
    .sort((a, b) => b.population - a.population)
    .slice(0, limit);
}
