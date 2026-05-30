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

/** World-scale viewport centered on a country (Explore → Map handoff). */
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
