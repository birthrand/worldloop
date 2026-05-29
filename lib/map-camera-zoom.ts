import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  MAP_COUNTRY_ZOOM_LATITUDE_DELTA,
  resolveGlobeZoomTier,
} from "@/lib/map-region-markers";

export type CameraZoomTier = "world" | "region" | "country";

/** Above this latitudeDelta the flat map is framed at world scale. */
export const FLAT_WORLD_LATITUDE_DELTA = 60;

/** Live flat-map zoom tier from the current viewport latitudeDelta. */
export function resolveFlatZoomTier(latitudeDelta: number): CameraZoomTier {
  if (latitudeDelta > FLAT_WORLD_LATITUDE_DELTA) return "world";
  if (latitudeDelta > MAP_COUNTRY_ZOOM_LATITUDE_DELTA) return "region";
  return "country";
}

export type CameraZoomState = {
  tier: CameraZoomTier;
  isDetailZoom: boolean;
};

/**
 * Single source of truth for zoom-driven UI/marker density.
 * Derived purely from the live camera (2D latitudeDelta or 3D globe distance),
 * never from selection state or flight phase timers.
 */
export function deriveCameraZoomState({
  is3d,
  latitudeDelta,
  globeDistance,
}: {
  is3d: boolean;
  latitudeDelta: number;
  globeDistance: number;
}): CameraZoomState {
  if (is3d) {
    return {
      tier: resolveGlobeZoomTier(globeDistance),
      isDetailZoom: globeDistance <= GLOBE_DETAIL_CAMERA_DISTANCE,
    };
  }

  const tier = resolveFlatZoomTier(latitudeDelta);
  return { tier, isDetailZoom: tier === "country" };
}
