import type { Continent } from "@/constants/regions";
import type { MapCountry } from "@/types/country";
import type { BBox } from "@/types/geo";
import type { LatLng } from "react-native-maps";

type GeoJsonGeometry =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "MultiPolygon";
      coordinates: number[][][][];
    };

type GeoJsonFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry | null;
  properties?: {
    CONTINENT?: string;
    ADMIN?: string;
    NAME?: string;
  };
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type CountryBoundaryPolygon = {
  id: string;
  /** Natural Earth `ADMIN` label (used to match REST Countries `name`). */
  countryName: string | null;
  continent: string | null;
  coordinates: LatLng[];
  holes?: LatLng[][];
};

export type BoundaryMapContext = {
  selectedCountryName: string | null;
  focusedRegion: string | null;
  countries: MapCountry[];
  /** When true at world zoom (no country/continent focus), render all country outlines. */
  showWorldBoundaries?: boolean;
};

/** REST Countries name → alternate Natural Earth `ADMIN` labels. */
const GEO_ADMIN_ALIASES_BY_API_NAME: Record<string, readonly string[]> = {
  "United States": ["United States of America"],
  Czechia: ["Czechia", "Czech Republic"],
  "Cape Verde": ["Cabo Verde"],
  "Ivory Coast": ["Côte d'Ivoire", "Cote d'Ivoire"],
  Eswatini: ["eSwatini", "Swaziland"],
  Myanmar: ["Myanmar", "Burma"],
  "North Korea": ["Dem. Rep. Korea", "North Korea"],
  "South Korea": ["Republic of Korea", "South Korea"],
  "North Macedonia": ["Macedonia", "North Macedonia"],
  "Republic of the Congo": ["Republic of the Congo"],
  "Democratic Republic of the Congo": [
    "Dem. Rep. Congo",
    "Democratic Republic of the Congo",
  ],
  /** REST Countries `name.common` — geo uses full ADMIN label. */
  "DR Congo": ["Dem. Rep. Congo", "Democratic Republic of the Congo"],
  "South Georgia": ["South Georgia and the Islands"],
};

const NATURAL_EARTH_CONTINENTS_BY_APP_REGION: Record<
  Continent,
  readonly string[]
> = {
  Africa: ["Africa"],
  "North America": ["North America"],
  "South America": ["South America"],
  Antarctic: ["Antarctica"],
  Asia: ["Asia"],
  Europe: ["Europe"],
  Oceania: ["Oceania"],
};

function normalizeCountryLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toLatLng([longitude, latitude]: number[]): LatLng {
  return { latitude, longitude };
}

function toRingPoints(ring: number[][]): LatLng[] {
  return ring.filter((point) => point.length >= 2).map(toLatLng);
}

function longitudeBoundsFromPoints(
  longitudes: number[],
): { west: number; east: number } | null {
  if (longitudes.length === 0) return null;

  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);

  if (east - west <= 180) {
    return { west, east };
  }

  const shifted = longitudes.map((lng) => (lng < 0 ? lng + 360 : lng));
  const shiftedWest = Math.min(...shifted);
  const shiftedEast = Math.max(...shifted);

  return {
    west: shiftedWest >= 180 ? shiftedWest - 360 : shiftedWest,
    east: shiftedEast > 180 ? shiftedEast - 360 : shiftedEast,
  };
}

/** Axis-aligned bounds from map ring coordinates (WGS84 degrees). */
export function bboxFromLatLngPoints(points: LatLng[]): BBox | null {
  if (points.length === 0) return null;

  let south = Infinity;
  let north = -Infinity;
  const longitudes: number[] = [];

  for (const point of points) {
    longitudes.push(point.longitude);
    south = Math.min(south, point.latitude);
    north = Math.max(north, point.latitude);
  }

  const longitudeBounds = longitudeBoundsFromPoints(longitudes);
  if (!longitudeBounds) return null;

  const { west, east } = longitudeBounds;

  if (
    !Number.isFinite(west) ||
    !Number.isFinite(east) ||
    !Number.isFinite(south) ||
    !Number.isFinite(north)
  ) {
    return null;
  }

  return { west, south, east, north };
}

type LongitudeInterval = { west: number; east: number };

/**
 * Antimeridian: when `west > east`, the bbox wraps across ±180° longitude.
 * Split into two non-wrapping boxes (same convention as `lib/spatial-query.ts`).
 */
function splitBBoxOnAntimeridian(bbox: BBox): BBox[] {
  if (bbox.west <= bbox.east) return [bbox];

  return [
    { west: bbox.west, south: bbox.south, east: 180, north: bbox.north },
    { west: -180, south: bbox.south, east: bbox.east, north: bbox.north },
  ];
}

/** Union longitude intervals on a circle; may return a wrapped interval (west > east). */
function mergeLongitudeIntervals(
  intervals: LongitudeInterval[],
): LongitudeInterval {
  if (intervals.length === 0) return { west: -180, east: 180 };

  const sorted = [...intervals].sort((left, right) => left.west - right.west);
  const merged: LongitudeInterval[] = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last || interval.west > last.east) {
      merged.push({ west: interval.west, east: interval.east });
      continue;
    }

    last.east = Math.max(last.east, interval.east);
  }

  if (merged.length === 1) {
    return merged[0];
  }

  let maxGapSize = -Infinity;
  let gapStart = merged[0].west;
  let gapEnd = merged[0].east;

  for (let index = 0; index < merged.length; index++) {
    const current = merged[index];
    const next = merged[(index + 1) % merged.length];
    const start = current.east;
    const end = next.west;
    const size = index < merged.length - 1 ? end - start : 360 - start + end;

    if (size > maxGapSize) {
      maxGapSize = size;
      gapStart = start;
      gapEnd = end;
    }
  }

  const span = 360 - maxGapSize;
  if (span >= 360) {
    return { west: -180, east: 180 };
  }

  return { west: gapEnd, east: gapStart };
}

/** Union of two bounding boxes (antimeridian-aware; disjoint extents may wrap). */
export function mergeBBoxes(a: BBox, b: BBox): BBox {
  const parts = [...splitBBoxOnAntimeridian(a), ...splitBBoxOnAntimeridian(b)];
  const { west, east } = mergeLongitudeIntervals(
    parts.map((part) => ({ west: part.west, east: part.east })),
  );

  return {
    west,
    south: Math.min(a.south, b.south),
    east,
    north: Math.max(a.north, b.north),
  };
}

export function bboxFromBoundaryPolygon(
  polygon: Pick<CountryBoundaryPolygon, "coordinates">,
): BBox | null {
  return bboxFromLatLngPoints(polygon.coordinates);
}

/**
 * GeoJSON often repeats the south pole at both -180° and 180°, which makes
 * react-native-maps draw a map-spanning edge. Drop the duplicate seam point.
 */
function removeAntimeridianPoleSeam(points: LatLng[]): LatLng[] {
  if (points.length < 4) return points;

  const result: LatLng[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    const after = points[i + 1];

    if (
      prev &&
      after &&
      Math.abs(prev.longitude - next.longitude) > 180 &&
      Math.abs(prev.latitude) > 85 &&
      Math.abs(next.latitude) > 85 &&
      Math.abs(after.longitude - next.longitude) < 90
    ) {
      continue;
    }

    result.push(next);
  }

  return result.length >= 3 ? result : points;
}

function parsePolygonRings(
  polygonCoordinates: number[][][],
  featureId: string,
  countryName: string | null,
  continent: string | null,
): CountryBoundaryPolygon[] {
  if (polygonCoordinates.length === 0) return [];

  const rawOuter = toRingPoints(polygonCoordinates[0] ?? []);
  const outer =
    countryName === "Antarctica"
      ? removeAntimeridianPoleSeam(rawOuter)
      : rawOuter;
  if (outer.length < 3) return [];

  const holeRings = polygonCoordinates
    .slice(1)
    .map(toRingPoints)
    .filter((ring) => ring.length >= 3);

  return [
    {
      id: featureId,
      countryName,
      continent,
      coordinates: outer,
      holes: holeRings.length > 0 ? holeRings : undefined,
    },
  ];
}

export function parseCountryBoundaryPolygons(
  geoJson: GeoJsonFeatureCollection,
): CountryBoundaryPolygon[] {
  if (!geoJson || geoJson.type !== "FeatureCollection") return [];

  const polygons: CountryBoundaryPolygon[] = [];

  geoJson.features.forEach((feature, featureIndex) => {
    const geometry = feature.geometry;
    if (!geometry) return;

    const props = feature.properties;
    const countryName = props?.ADMIN ?? props?.NAME ?? null;
    const continent = props?.CONTINENT ?? null;
    const baseId = `country-boundary-${featureIndex}`;

    if (geometry.type === "Polygon") {
      polygons.push(
        ...parsePolygonRings(
          geometry.coordinates,
          `${baseId}-0`,
          countryName,
          continent,
        ),
      );
      return;
    }

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygonCoordinates, polygonIndex) => {
        polygons.push(
          ...parsePolygonRings(
            polygonCoordinates,
            `${baseId}-${polygonIndex}`,
            countryName,
            continent,
          ),
        );
      });
    }
  });

  return polygons;
}

const parsedCountryBoundariesByGeoJson = new Map<
  GeoJsonFeatureCollection,
  CountryBoundaryPolygon[]
>();

export function getCountryBoundaryPolygons(
  geoJson: GeoJsonFeatureCollection,
): CountryBoundaryPolygon[] {
  const cached = parsedCountryBoundariesByGeoJson.get(geoJson);
  if (cached) {
    return cached;
  }

  const parsed = parseCountryBoundaryPolygons(geoJson);
  parsedCountryBoundariesByGeoJson.set(geoJson, parsed);
  return parsed;
}

export function countryNamesMatch(
  apiCountryName: string,
  geoAdminName: string | null,
): boolean {
  if (!geoAdminName) return false;

  const normalizedGeo = normalizeCountryLabel(geoAdminName);
  const candidates = [
    apiCountryName,
    ...(GEO_ADMIN_ALIASES_BY_API_NAME[apiCountryName] ?? []),
  ];

  return candidates.some(
    (candidate) => normalizeCountryLabel(candidate) === normalizedGeo,
  );
}

function naturalEarthContinentMatchesRegion(
  continent: string | null,
  region: string,
): boolean {
  if (!continent) return false;

  const allowed =
    NATURAL_EARTH_CONTINENTS_BY_APP_REGION[region as Continent] ?? [];
  return allowed.includes(continent);
}

/**
 * Scope boundaries to map context (option 1 — implicit, no extra UI):
 * - Selected country → that country only (even when a continent is focused)
 * - Focused continent (no country selected) → countries in that region
 * - No focus → hidden unless `showWorldBoundaries` (grid toggle on world view)
 */
export function filterBoundaryPolygonsByMapContext(
  polygons: CountryBoundaryPolygon[],
  context: BoundaryMapContext,
): CountryBoundaryPolygon[] {
  const { selectedCountryName, focusedRegion, countries, showWorldBoundaries } =
    context;

  if (!selectedCountryName && !focusedRegion) {
    return showWorldBoundaries ? polygons : [];
  }

  if (selectedCountryName) {
    return polygons.filter((polygon) =>
      countryNamesMatch(selectedCountryName, polygon.countryName),
    );
  }

  if (focusedRegion) {
    const apiCountryNames = countries
      .filter((country) => country.region === focusedRegion)
      .map((country) => country.name);

    return polygons.filter((polygon) => {
      if (
        polygon.countryName &&
        apiCountryNames.some((name) =>
          countryNamesMatch(name, polygon.countryName),
        )
      ) {
        return true;
      }

      return naturalEarthContinentMatchesRegion(
        polygon.continent,
        focusedRegion,
      );
    });
  }

  return [];
}
