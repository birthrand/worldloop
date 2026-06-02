import type { Region } from "react-native-maps";

import { ZOOM_TIER_THRESHOLDS } from "@/constants/geo";
import {
  FLAT_WORLD_LATITUDE_DELTA,
  resolveFlatZoomTier,
} from "@/lib/map-camera-zoom";
import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  GLOBE_REGION_CAMERA_DISTANCE,
  GLOBE_WORLD_CAMERA_DISTANCE,
  MAP_COUNTRY_ZOOM_LATITUDE_DELTA,
  REGION_FOCUS_INITIAL_DELTA,
  resolveGlobeZoomTier,
} from "@/lib/map-region-markers";
import type { BBox, ZoomTier } from "@/types/geo";

/** Visible longitude span relative to latitude span (globe fixed camera is slightly wider). */
const GLOBE_LONGITUDE_SPAN_FACTOR = 1.15;

export function bboxFromMapRegion(region: Region): BBox {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;

  return {
    south: region.latitude - halfLat,
    north: region.latitude + halfLat,
    west: region.longitude - halfLng,
    east: region.longitude + halfLng,
  };
}

/**
 * Approximate visible lat/lng span from globe camera distance using the same
 * anchor points as `resolveGlobeDistanceFromLatitudeDelta` (inverted).
 */
/** Inverse of `resolveGlobeDistanceFromLatitudeDelta` — approximate flat-map span. */
export function resolveLatitudeDeltaFromGlobeDistance(
  distance: number,
): number {
  if (!Number.isFinite(distance) || distance <= 0) {
    return ZOOM_TIER_THRESHOLDS.worldRegionDelta;
  }

  if (distance >= GLOBE_WORLD_CAMERA_DISTANCE) {
    return ZOOM_TIER_THRESHOLDS.worldRegionDelta;
  }

  if (distance >= GLOBE_REGION_CAMERA_DISTANCE) {
    const span = GLOBE_WORLD_CAMERA_DISTANCE - GLOBE_REGION_CAMERA_DISTANCE;
    const t = (distance - GLOBE_REGION_CAMERA_DISTANCE) / span;
    return (
      REGION_FOCUS_INITIAL_DELTA +
      t * (ZOOM_TIER_THRESHOLDS.worldRegionDelta - REGION_FOCUS_INITIAL_DELTA)
    );
  }

  if (distance <= GLOBE_DETAIL_CAMERA_DISTANCE) {
    return ZOOM_TIER_THRESHOLDS.countryRegionDelta;
  }

  const span = GLOBE_REGION_CAMERA_DISTANCE - GLOBE_DETAIL_CAMERA_DISTANCE;
  const t = (distance - GLOBE_DETAIL_CAMERA_DISTANCE) / span;
  return (
    MAP_COUNTRY_ZOOM_LATITUDE_DELTA +
    t * (REGION_FOCUS_INITIAL_DELTA - MAP_COUNTRY_ZOOM_LATITUDE_DELTA)
  );
}

export function bboxFromGlobeCamera(state: {
  targetLat: number;
  targetLng: number;
  distance: number;
}): BBox {
  const latitudeDelta = resolveLatitudeDeltaFromGlobeDistance(state.distance);
  const longitudeDelta = latitudeDelta * GLOBE_LONGITUDE_SPAN_FACTOR;
  const halfLat = latitudeDelta / 2;
  const halfLng = longitudeDelta / 2;

  return {
    south: state.targetLat - halfLat,
    north: state.targetLat + halfLat,
    west: state.targetLng - halfLng,
    east: state.targetLng + halfLng,
  };
}

/** Flat-map region matching a live globe camera (3D → 2D viewport handoff). */
export function regionFromGlobeCamera(state: {
  targetLat: number;
  targetLng: number;
  distance: number;
}): Region {
  const latitudeDelta = resolveLatitudeDeltaFromGlobeDistance(state.distance);
  return {
    latitude: state.targetLat,
    longitude: state.targetLng,
    latitudeDelta,
    longitudeDelta: latitudeDelta * GLOBE_LONGITUDE_SPAN_FACTOR,
  };
}

/**
 * Map live camera + focus state to geo discovery tiers.
 * Reuses flat/globe tier thresholds from map-camera-zoom and map-region-markers.
 */
export function resolveZoomTier(input: {
  mapMode: "2d" | "3d";
  latitudeDelta?: number;
  globeDistance?: number;
  focusedRegion: string | null;
  activeCountryName: string | null;
}): ZoomTier {
  if (input.activeCountryName) {
    return "country";
  }

  const cameraTier =
    input.mapMode === "3d"
      ? resolveGlobeZoomTier(input.globeDistance ?? GLOBE_WORLD_CAMERA_DISTANCE)
      : resolveFlatZoomTier(input.latitudeDelta ?? FLAT_WORLD_LATITUDE_DELTA);

  if (cameraTier === "world") {
    return "world";
  }

  if (cameraTier === "region") {
    return "continent";
  }

  // Detail zoom without an active country — very local viewport.
  const latitudeDelta = input.latitudeDelta ?? Number.POSITIVE_INFINITY;
  const globeDistance = input.globeDistance ?? Number.POSITIVE_INFINITY;
  const isLocal =
    input.mapMode === "3d"
      ? globeDistance <= GLOBE_DETAIL_CAMERA_DISTANCE
      : latitudeDelta <= ZOOM_TIER_THRESHOLDS.countryRegionDelta;

  return isLocal ? "local" : "country";
}
