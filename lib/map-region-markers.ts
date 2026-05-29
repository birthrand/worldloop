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

/** Globe distance for continent framing after zooming out from country detail. */
export const GLOBE_REGION_CAMERA_DISTANCE = 2.75;

/** Above this distance the globe is in world view (no continent selected). */
export const GLOBE_WORLD_ZOOM_DISTANCE = 3.45;

/** Opacity for sibling flags when one country stays softly highlighted at continent zoom. */
export const MARKER_DEEMPHASIZED_OPACITY = 0.34;

/** One-shot pin scale peak while the camera flies to a country (2D + 3D). */
export const MAP_FOCUS_TRANSITION_SCALE_PEAK = 1.12;
/** Matches default 2D `animateToRegion` flight duration in map screen. */
export const MAP_FOCUS_TRANSITION_2D_MS = 650;
/** Matches default 3D globe focus flight duration in map screen. */
export const MAP_FOCUS_TRANSITION_3D_MS = 1100;

/** 0–1 flight progress → scale multiplier (1 → peak → 1). */
export function resolveFocusTransitionScale(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  const peakDelta = MAP_FOCUS_TRANSITION_SCALE_PEAK - 1;

  if (t <= 0.5) {
    const p = t / 0.5;
    const eased = 1 - (1 - p) * (1 - p);
    return 1 + peakDelta * eased;
  }

  const p = (t - 0.5) / 0.5;
  const eased = p * p;
  return MAP_FOCUS_TRANSITION_SCALE_PEAK - peakDelta * eased;
}

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
