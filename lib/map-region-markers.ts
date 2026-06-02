import { getMapDisplayLatLng } from "@/lib/map-country";
import type { SelectionSource } from "@/store/use-identity-store";
import type { MapCountry } from "@/types/country";

/** Flag pins shown at continent/region zoom — zoom in to reveal the rest. */
export const REGION_ZOOM_MARKER_CAP = 16;

/**
 * Max flags when a country is selected — focal pin + nearby suggestions.
 * Interior countries: up to 7 neighbors (8 total including focal).
 */
export const SELECTED_COUNTRY_MARKER_CAP = 8;

/** Same-continent suggestions at a continental edge (excludes focal). */
export const BRIDGE_SAME_REGION_CAP = 4;
/** Cross-continent suggestions from the nearest foreign continent. */
export const BRIDGE_CROSS_REGION_CAP = 4;
/**
 * Bridge when the nearest foreign-continent country is closer than this rank
 * among same-continent neighbors (data-driven "continental edge" detection).
 */
export const CROSS_CONTINENT_BRIDGE_RANK = 6;

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

/** Default globe camera distance — world view framing (see globe-view). */
export const GLOBE_WORLD_CAMERA_DISTANCE = 3.88;

export type GlobeCountryFlightMode = "focus" | "preview";

/**
 * Target camera distance for a country flight on the 3D globe.
 * Returns `undefined` when the flight should keep the current distance (pinch zoom).
 */
export function resolveGlobeCountryTargetDistance(
  mode: GlobeCountryFlightMode,
  source: Exclude<SelectionSource, null>,
  currentDistance: number,
): number | undefined {
  if (mode === "preview") {
    return GLOBE_DETAIL_CAMERA_DISTANCE;
  }
  if (source === "explore" || source === "fab") {
    return GLOBE_WORLD_CAMERA_DISTANCE;
  }
  if (source === "mapTap" && currentDistance < GLOBE_REGION_CAMERA_DISTANCE) {
    return undefined;
  }
  return GLOBE_REGION_CAMERA_DISTANCE;
}

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

/** Nearest countries to a selected pin — hides distant ones in the same region. */
export function capMapCountriesByProximity(
  countries: MapCountry[],
  focalCountryName: string,
  limit = REGION_ZOOM_MARKER_CAP,
): MapCountry[] {
  if (countries.length <= limit) return countries;

  const focal = countries.find((country) => country.name === focalCountryName);
  if (!focal) return capMapCountriesByPopulation(countries, limit);

  const [focalLat, focalLng] = getMapDisplayLatLng(focal);

  return sortCountriesByDistanceFrom(countries, focalLat, focalLng).slice(
    0,
    limit,
  );
}

type SelectedCountryMarkerContext = {
  /** Full chip-filtered pool — used to find cross-continent neighbors. */
  allCountries: MapCountry[];
  focusedRegion: string;
};

/**
 * True when a foreign-continent country is closer than the Nth nearest
 * same-continent neighbor — a data-driven signal for continental edge.
 */
export function shouldBridgeToNearbyContinent(
  focal: MapCountry,
  sameRegionCountries: MapCountry[],
  foreignCountries: MapCountry[],
  bridgeRank = CROSS_CONTINENT_BRIDGE_RANK,
): boolean {
  if (foreignCountries.length === 0) return false;

  const [focalLat, focalLng] = getMapDisplayLatLng(focal);
  const sameDistances = sameRegionCountries
    .filter((country) => country.name !== focal.name)
    .map((country) => squaredDistanceToViewport(country, focalLat, focalLng))
    .sort((a, b) => a - b);

  const nearestForeignDistance = Math.min(
    ...foreignCountries.map((country) =>
      squaredDistanceToViewport(country, focalLat, focalLng),
    ),
  );
  if (!Number.isFinite(nearestForeignDistance)) return false;

  const rankIndex = bridgeRank - 1;
  const nthSameDistance =
    sameDistances.length === 0
      ? Infinity
      : sameDistances[Math.min(rankIndex, sameDistances.length - 1)];

  return nearestForeignDistance < nthSameDistance;
}

/** Selected pin neighbors — same continent, or split with closest foreign continent. */
export function resolveNearbySelectedCountryMarkers(
  sameRegionCountries: MapCountry[],
  focalCountryName: string,
  context: SelectedCountryMarkerContext,
): MapCountry[] {
  const focal =
    sameRegionCountries.find((country) => country.name === focalCountryName) ??
    context.allCountries.find((country) => country.name === focalCountryName);
  if (!focal) {
    return capMapCountriesByPopulation(sameRegionCountries);
  }

  const foreignCountries = context.allCountries.filter(
    (country) =>
      country.region !== context.focusedRegion &&
      country.name !== focalCountryName,
  );

  if (
    !shouldBridgeToNearbyContinent(focal, sameRegionCountries, foreignCountries)
  ) {
    return capMapCountriesByProximity(
      sameRegionCountries,
      focalCountryName,
      SELECTED_COUNTRY_MARKER_CAP,
    );
  }

  const [focalLat, focalLng] = getMapDisplayLatLng(focal);
  const sameRegionNeighbors = sortCountriesByDistanceFrom(
    sameRegionCountries.filter((country) => country.name !== focal.name),
    focalLat,
    focalLng,
  ).slice(0, BRIDGE_SAME_REGION_CAP);

  const foreignSorted = sortCountriesByDistanceFrom(
    foreignCountries,
    focalLat,
    focalLng,
  );
  const closestForeignRegion = foreignSorted[0]?.region;
  const crossRegionNeighbors = closestForeignRegion
    ? foreignSorted
        .filter((country) => country.region === closestForeignRegion)
        .slice(0, BRIDGE_CROSS_REGION_CAP)
    : [];

  return uniqueCountriesByName([
    focal,
    ...sameRegionNeighbors,
    ...crossRegionNeighbors,
  ]).slice(0, BRIDGE_SAME_REGION_CAP + BRIDGE_CROSS_REGION_CAP + 1);
}

/** Ensures a focal country stays in the marker list (e.g. random FAB at continent zoom). */
export function ensureMapCountryInMarkerList(
  countries: MapCountry[],
  countryName: string | null | undefined,
): MapCountry[] {
  if (!countryName) return countries;
  if (countries.some((c) => c.name === countryName)) return countries;

  const focal = countries.find((c) => c.name === countryName);
  return focal ? [...countries, focal] : countries;
}

/**
 * Marker density for a focused region:
 * - Selected country → nearest neighbors (with optional cross-continent bridge)
 * - Detail zoom, no selection → full region list
 * - Continent zoom, no selection → top countries by population
 */
export function resolveRegionMarkerCountries(
  countries: MapCountry[],
  isDetailZoom: boolean,
  focalCountryName?: string | null,
  selectedContext?: SelectedCountryMarkerContext | null,
): MapCountry[] {
  const resolved = focalCountryName
    ? selectedContext
      ? resolveNearbySelectedCountryMarkers(
          countries,
          focalCountryName,
          selectedContext,
        )
      : capMapCountriesByProximity(
          countries,
          focalCountryName,
          SELECTED_COUNTRY_MARKER_CAP,
        )
    : isDetailZoom
      ? countries
      : capMapCountriesByPopulation(countries);
  return ensureMapCountryInMarkerList(resolved, focalCountryName);
}

function sortCountriesByDistanceFrom(
  countries: MapCountry[],
  focalLat: number,
  focalLng: number,
): MapCountry[] {
  return [...countries].sort(
    (a, b) =>
      squaredDistanceToViewport(a, focalLat, focalLng) -
      squaredDistanceToViewport(b, focalLat, focalLng),
  );
}

function uniqueCountriesByName(countries: MapCountry[]): MapCountry[] {
  const seen = new Set<string>();
  const result: MapCountry[] = [];
  for (const country of countries) {
    if (seen.has(country.name)) continue;
    seen.add(country.name);
    result.push(country);
  }
  return result;
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
  focalCountryName?: string | null,
): MapCountry[] {
  const sorted = [...countries].sort(
    (a, b) =>
      squaredDistanceToViewport(a, centerLat, centerLng) -
      squaredDistanceToViewport(b, centerLat, centerLng),
  );

  if (!focalCountryName) return sorted;

  const focalIndex = sorted.findIndex((c) => c.name === focalCountryName);
  if (focalIndex <= 0) return sorted;

  const focal = sorted[focalIndex];
  if (!focal) return sorted;

  return [
    focal,
    ...sorted.slice(0, focalIndex),
    ...sorted.slice(focalIndex + 1),
  ];
}
