import type { LatLng } from "react-native-maps";

import type { MapCluster } from "@/lib/map-clusters";
import {
  countryNamesMatch,
  type CountryBoundaryPolygon,
} from "@/lib/map-country-boundaries";
import type { MapCountry } from "@/types/country";

export type MapPressCoordinate = {
  latitude: number;
  longitude: number;
};

type RingBBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

function ringBBox(ring: LatLng[]): RingBBox {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const point of ring) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  return { minLat, maxLat, minLng, maxLng };
}

function pointInBBox(point: MapPressCoordinate, bbox: RingBBox): boolean {
  return (
    point.latitude >= bbox.minLat &&
    point.latitude <= bbox.maxLat &&
    point.longitude >= bbox.minLng &&
    point.longitude <= bbox.maxLng
  );
}

function pointInRing(point: MapPressCoordinate, ring: LatLng[]): boolean {
  if (ring.length < 3) return false;

  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].longitude;
    const yi = ring[i].latitude;
    const xj = ring[j].longitude;
    const yj = ring[j].latitude;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function approximateRingArea(ring: LatLng[]): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j].longitude * ring[i].latitude;
    area -= ring[i].longitude * ring[j].latitude;
  }
  return Math.abs(area / 2);
}

function pointInPolygonWithHoles(
  point: MapPressCoordinate,
  outer: LatLng[],
  holes?: LatLng[][],
): boolean {
  if (!pointInRing(point, outer)) return false;
  if (!holes?.length) return true;

  for (const hole of holes) {
    if (hole.length >= 3 && pointInRing(point, hole)) return false;
  }

  return true;
}

export function findMapCountryByBoundaryName(
  countries: MapCountry[],
  geoAdminName: string | null,
): MapCountry | null {
  if (!geoAdminName) return null;
  return (
    countries.find((country) => countryNamesMatch(country.name, geoAdminName)) ??
    null
  );
}

/**
 * Resolves a map tap to a country using Natural Earth polygons.
 * When multiple polygons overlap (borders), prefers the smallest match.
 */
export function findMapCountryAtCoordinate(
  polygons: CountryBoundaryPolygon[],
  countries: MapCountry[],
  coordinate: MapPressCoordinate,
): MapCountry | null {
  let best: { country: MapCountry; area: number } | null = null;

  for (const polygon of polygons) {
    if (!polygon.countryName) continue;

    const bbox = ringBBox(polygon.coordinates);
    if (!pointInBBox(coordinate, bbox)) continue;
    if (
      !pointInPolygonWithHoles(
        coordinate,
        polygon.coordinates,
        polygon.holes,
      )
    ) {
      continue;
    }

    const country = findMapCountryByBoundaryName(
      countries,
      polygon.countryName,
    );
    if (!country) continue;

    const area = approximateRingArea(polygon.coordinates);
    if (!best || area < best.area) {
      best = { country, area };
    }
  }

  return best?.country ?? null;
}

/** World-view tap: land hit → app's continent cluster for that country's region. */
export function findClusterAtWorldCoordinate(
  polygons: CountryBoundaryPolygon[],
  countries: MapCountry[],
  clusters: MapCluster[],
  coordinate: MapPressCoordinate,
): MapCluster | null {
  const country = findMapCountryAtCoordinate(polygons, countries, coordinate);
  if (!country) return null;
  return clusters.find((cluster) => cluster.region === country.region) ?? null;
}
