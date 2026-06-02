import type { Region } from "react-native-maps";

import { getMapDisplayLatLng } from "@/lib/map-country";
import { REGION_FOCUS_INITIAL_DELTA } from "@/lib/map-region-markers";
import type { MapCountry } from "@/types/country";

export const WORLD_INITIAL_REGION: Region = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 120,
};

export function regionForCountry(latlng: [number, number], delta = 18): Region {
  return {
    latitude: latlng[0],
    longitude: latlng[1],
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

/** Camera region centered on a country pin (handles south-pole coordinates). */
export function regionForMapCountry(
  country: Pick<MapCountry, "name" | "latlng" | "region">,
  delta = 18,
): Region {
  return regionForCountry(getMapDisplayLatLng(country), delta);
}

/** World-scale viewport centered on a country (phase 2 of rotate-then-pan at world zoom). */
export function regionForWorldViewCountry(
  country: Pick<MapCountry, "name" | "latlng" | "region">,
): Region {
  const [lat, lng] = getMapDisplayLatLng(country);
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: WORLD_INITIAL_REGION.latitudeDelta,
    longitudeDelta: WORLD_INITIAL_REGION.longitudeDelta,
  };
}

function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) return WORLD_INITIAL_REGION.longitude;
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/** Shortest east/west path between two meridians (degrees). */
export function shortestLongitudeDelta(fromLng: number, toLng: number): number {
  let delta = toLng - fromLng;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

/**
 * World zoom — phase 1 of rotate-then-pan: spin toward the country's meridian
 * while keeping the current latitude.
 */
export function regionForWorldViewRotateToCountry(
  country: Pick<MapCountry, "name" | "latlng" | "region">,
  fromRegion: Region = WORLD_INITIAL_REGION,
): Region {
  const [, targetLng] = getMapDisplayLatLng(country);
  return {
    latitude: fromRegion.latitude,
    longitude: normalizeLongitude(
      fromRegion.longitude +
        shortestLongitudeDelta(fromRegion.longitude, targetLng),
    ),
    latitudeDelta: WORLD_INITIAL_REGION.latitudeDelta,
    longitudeDelta: WORLD_INITIAL_REGION.longitudeDelta,
  };
}

/** Framed for the Antarctic continent + nearby island territories. */
export const ANTARCTIC_FOCUS_REGION: Region = {
  latitude: -72,
  longitude: 20,
  latitudeDelta: 42,
  longitudeDelta: 110,
};

export function regionForClusterFocus(cluster: {
  region: string;
  center: [number, number];
}): Region {
  if (cluster.region === "Antarctic") {
    return ANTARCTIC_FOCUS_REGION;
  }
  return regionForCountry(cluster.center, REGION_FOCUS_INITIAL_DELTA);
}
