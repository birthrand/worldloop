import { getMapDisplayLatLng } from "@/lib/map-country";
import {
  bboxFromLatLngPoints,
  countryNamesMatch,
  getCountryBoundaryPolygons,
} from "@/lib/map-country-boundaries";
import { bboxesIntersect } from "@/lib/spatial-query";
import type { MapCountry } from "@/types/country";
import type { BBox } from "@/types/geo";
import type { LatLng } from "react-native-maps";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

const BORDER_BBOX_GAP_DEG = 0.15;
const MAX_RING_SAMPLES = 32;

const CARDINAL_BEARINGS = [
  { targetBearing: 0 },
  { targetBearing: 90 },
  { targetBearing: 180 },
  { targetBearing: 270 },
] as const;

type GeoCountryRings = {
  geoAdminName: string;
  pointKeys: Set<string>;
  bbox: BBox;
};

let cachedBorderGraph: Map<string, Set<string>> | null = null;
let cachedGeoNamesByApiCountry: Map<string, string[]> | null = null;

function bboxesWithinGap(a: BBox, b: BBox, gapDeg: number): boolean {
  return bboxesIntersect(a, {
    west: b.west - gapDeg,
    south: b.south - gapDeg,
    east: b.east + gapDeg,
    north: b.north + gapDeg,
  });
}

function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildPointKeys(rings: LatLng[][]): Set<string> {
  const keys = new Set<string>();

  for (const ring of rings) {
    const step = Math.max(1, Math.ceil(ring.length / MAX_RING_SAMPLES));
    for (let index = 0; index < ring.length; index += step) {
      const point = ring[index];
      if (!point) continue;
      keys.add(`${roundCoord(point.latitude)},${roundCoord(point.longitude)}`);
    }
  }

  return keys;
}

function setsShareBorder(keysA: Set<string>, keysB: Set<string>): boolean {
  for (const key of keysA) {
    if (keysB.has(key)) return true;
  }
  return false;
}

function buildGeoCountryRingsIndex(): GeoCountryRings[] {
  const polygons = getCountryBoundaryPolygons(countriesGeoJson);
  const grouped = new Map<string, LatLng[][]>();

  for (const polygon of polygons) {
    if (!polygon.countryName) continue;
    const rings = grouped.get(polygon.countryName) ?? [];
    rings.push(polygon.coordinates);
    grouped.set(polygon.countryName, rings);
  }

  const entries: GeoCountryRings[] = [];
  for (const [geoAdminName, rings] of grouped) {
    const bbox = bboxFromLatLngPoints(rings.flat());
    if (!bbox) continue;
    entries.push({
      geoAdminName,
      pointKeys: buildPointKeys(rings),
      bbox,
    });
  }

  return entries;
}

function getBorderGraph(): Map<string, Set<string>> {
  if (cachedBorderGraph) return cachedBorderGraph;

  const entries = buildGeoCountryRingsIndex();
  const graph = new Map<string, Set<string>>();

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (!a || !b) continue;
      if (!bboxesWithinGap(a.bbox, b.bbox, BORDER_BBOX_GAP_DEG)) continue;
      if (!setsShareBorder(a.pointKeys, b.pointKeys)) continue;

      if (!graph.has(a.geoAdminName)) graph.set(a.geoAdminName, new Set());
      if (!graph.has(b.geoAdminName)) graph.set(b.geoAdminName, new Set());
      graph.get(a.geoAdminName)!.add(b.geoAdminName);
      graph.get(b.geoAdminName)!.add(a.geoAdminName);
    }
  }

  cachedBorderGraph = graph;
  return graph;
}

function resolveGeoAdminNamesForApiCountry(apiCountryName: string): string[] {
  if (!cachedGeoNamesByApiCountry) {
    cachedGeoNamesByApiCountry = new Map();
  }

  const cached = cachedGeoNamesByApiCountry.get(apiCountryName);
  if (cached) return cached;

  const polygons = getCountryBoundaryPolygons(countriesGeoJson);
  const names = new Set<string>();

  for (const polygon of polygons) {
    if (countryNamesMatch(apiCountryName, polygon.countryName)) {
      if (polygon.countryName) names.add(polygon.countryName);
    }
  }

  const resolved = [...names];
  cachedGeoNamesByApiCountry.set(apiCountryName, resolved);
  return resolved;
}

function getBorderingGeoAdminNames(apiCountryName: string): Set<string> {
  const graph = getBorderGraph();
  const bordering = new Set<string>();

  for (const geoName of resolveGeoAdminNamesForApiCountry(apiCountryName)) {
    for (const neighbor of graph.get(geoName) ?? []) {
      bordering.add(neighbor);
    }
  }

  return bordering;
}

function resolveMapCountriesForGeoNames(
  geoAdminNames: Iterable<string>,
  pool: MapCountry[],
): MapCountry[] {
  const resolved: MapCountry[] = [];
  const seen = new Set<string>();

  for (const geoAdminName of geoAdminNames) {
    const match =
      pool.find((country) => countryNamesMatch(country.name, geoAdminName)) ??
      null;
    if (!match || seen.has(match.name)) continue;
    seen.add(match.name);
    resolved.push(match);
  }

  return resolved;
}

function bearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function bearingDeltaDeg(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

function squaredDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return dLat * dLat + dLng * dLng;
}

function pickCardinalNeighbors(
  focal: MapCountry,
  candidates: MapCountry[],
  limit: number,
): MapCountry[] {
  const [focalLat, focalLng] = getMapDisplayLatLng(focal);
  const selected: MapCountry[] = [focal];
  const used = new Set<string>([focal.name]);

  for (const { targetBearing } of CARDINAL_BEARINGS) {
    if (selected.length >= limit) break;

    let best: MapCountry | null = null;
    let bestBearingDelta = Infinity;
    let bestDistance = Infinity;

    for (const candidate of candidates) {
      if (used.has(candidate.name)) continue;

      const [lat, lng] = getMapDisplayLatLng(candidate);
      const bearing = bearingDeg(focalLat, focalLng, lat, lng);
      const bearingDelta = bearingDeltaDeg(bearing, targetBearing);
      const distance = squaredDistance(focalLat, focalLng, lat, lng);

      if (
        bearingDelta < bestBearingDelta ||
        (bearingDelta === bestBearingDelta && distance < bestDistance)
      ) {
        best = candidate;
        bestBearingDelta = bearingDelta;
        bestDistance = distance;
      }
    }

    if (!best) continue;

    selected.push(best);
    used.add(best.name);
  }

  if (selected.length < limit) {
    const unusedCandidates = candidates.filter(
      (candidate) => !used.has(candidate.name),
    );
    unusedCandidates.sort((a, b) => {
      const [latA, lngA] = getMapDisplayLatLng(a);
      const [latB, lngB] = getMapDisplayLatLng(b);
      return (
        squaredDistance(focalLat, focalLng, latA, lngA) -
        squaredDistance(focalLat, focalLng, latB, lngB)
      );
    });

    for (const candidate of unusedCandidates) {
      if (selected.length >= limit) break;
      selected.push(candidate);
      used.add(candidate.name);
    }
  }

  return selected;
}

/**
 * 3D globe: focal country + up to four bordering neighbors (N, E, S, W).
 * Falls back to cardinal proximity picks when no shared borders exist (islands).
 */
export function capMapCountriesByCardinalBorderNeighbors(
  countries: MapCountry[],
  focalCountryName: string,
  limit: number,
): MapCountry[] {
  if (countries.length <= limit) return countries;

  const focal =
    countries.find((country) => country.name === focalCountryName) ?? null;
  if (!focal) return countries.slice(0, limit);

  const pool = countries.filter((country) => country.name !== focalCountryName);
  if (pool.length === 0) return [focal];

  const borderingGeoNames = getBorderingGeoAdminNames(focalCountryName);
  const bordering = resolveMapCountriesForGeoNames(borderingGeoNames, pool);
  const candidates =
    bordering.length > 0
      ? bordering
      : [...pool].sort((a, b) => {
          const [focalLat, focalLng] = getMapDisplayLatLng(focal);
          const [latA, lngA] = getMapDisplayLatLng(a);
          const [latB, lngB] = getMapDisplayLatLng(b);
          return (
            squaredDistance(focalLat, focalLng, latA, lngA) -
            squaredDistance(focalLat, focalLng, latB, lngB)
          );
        });

  return pickCardinalNeighbors(focal, candidates, limit);
}
