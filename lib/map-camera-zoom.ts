import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  GLOBE_REGION_CAMERA_DISTANCE,
  GLOBE_WORLD_CAMERA_DISTANCE,
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

/** Match 2D zoom tier to the nearest globe camera distance constant. */
export function resolveGlobeDistanceFromLatitudeDelta(
  latitudeDelta: number,
): number {
  if (!Number.isFinite(latitudeDelta) || latitudeDelta <= 0) {
    return GLOBE_WORLD_CAMERA_DISTANCE;
  }

  const tier = resolveFlatZoomTier(latitudeDelta);
  if (tier === "world") return GLOBE_WORLD_CAMERA_DISTANCE;
  if (tier === "region") return GLOBE_REGION_CAMERA_DISTANCE;
  return GLOBE_DETAIL_CAMERA_DISTANCE;
}

/**
 * Continent focus on the globe — never looser than region framing; keep closer 2D zoom.
 */
export function resolveGlobeContinentTargetDistance(
  latitudeDelta: number,
): number {
  return Math.min(
    resolveGlobeDistanceFromLatitudeDelta(latitudeDelta),
    GLOBE_REGION_CAMERA_DISTANCE,
  );
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
