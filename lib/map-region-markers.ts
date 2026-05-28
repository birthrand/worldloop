import { getMapDisplayLatLng } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

/** Flag pins shown at continent/region zoom — zoom in to reveal the rest. */
export const REGION_ZOOM_MARKER_CAP = 16;

/** Below this latitudeDelta (2D), show every filtered country in the focused region. */
export const MAP_COUNTRY_ZOOM_LATITUDE_DELTA = 28;
/** Cluster focus lands here; any zoom-in movement beyond this reveals all flags. */
export const REGION_FOCUS_INITIAL_DELTA = 45;

/** Globe camera distance at or below this shows every country in the focused region. */
export const GLOBE_DETAIL_CAMERA_DISTANCE = 2;

/** Above this distance the globe is in world view (no continent selected). */
export const GLOBE_WORLD_ZOOM_DISTANCE = 3.45;

export type GlobeZoomTier = "world" | "region" | "country";

export function resolveGlobeZoomTier(distance: number): GlobeZoomTier {
  if (distance > GLOBE_WORLD_ZOOM_DISTANCE) return "world";
  if (distance > GLOBE_DETAIL_CAMERA_DISTANCE) return "region";
  return "country";
}

/** 0 at detail zoom, 1 at far region zoom — fades markers without hiding them. */
export function resolveRegionZoomFadeT(
  cameraDistance: number,
  minDistance = GLOBE_DETAIL_CAMERA_DISTANCE,
  maxDistance = GLOBE_DETAIL_CAMERA_DISTANCE + 0.85,
): number {
  if (maxDistance <= minDistance) return 0;
  return Math.min(
    1,
    Math.max(0, (cameraDistance - minDistance) / (maxDistance - minDistance)),
  );
}

/** First batch of flags after continent select (viewport-nearby). */
export const MARKER_REVEAL_PRIORITY_BATCH = 8;
/** Countries added per streaming batch after the priority batch. */
export const MARKER_REVEAL_BATCH_SIZE = 4;
/** Delay between streaming batches (ms). */
export const MARKER_REVEAL_BATCH_INTERVAL_MS = 100;

export type MapMarkerPresentation = "entering" | "full";

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

/** Full region list at detail zoom; capped major countries at continent zoom. */
export function resolveRegionMarkerCountries(
  countries: MapCountry[],
  isDetailZoom: boolean,
): MapCountry[] {
  return isDetailZoom ? countries : capMapCountriesByPopulation(countries);
}

function squaredDistanceToViewport(
  country: MapCountry,
  centerLat: number,
  centerLng: number,
): number {
  const [lat, lng] = getMapDisplayLatLng(country);
  const dLat = lat - centerLat;
  const dLng = lng - centerLng;
  return dLat * dLat + dLng * dLng;
}

/** Nearest-to-viewport-center first — used for staged flag reveal. */
export function sortCountriesByViewportPriority(
  countries: MapCountry[],
  centerLat: number,
  centerLng: number,
): MapCountry[] {
  return [...countries].sort(
    (a, b) =>
      squaredDistanceToViewport(a, centerLat, centerLng) -
      squaredDistanceToViewport(b, centerLat, centerLng),
  );
}
