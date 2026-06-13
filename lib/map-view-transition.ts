import { MAP_3D_ENABLED } from "@/constants/map-features";

/** Visual crossfade phase when switching 2D map ↔ 3D globe (not persisted). */
export type MapViewTransition =
  | "idle"
  | "enteringGlobe"
  | "ready"
  | "enteringFlat";

export const GLOBE_CROSSFADE_MS = 300;
export const MAP_DIM_HOLD_MS = 200;

/** Initial/restored transition — no crossfade when rehydrating a persisted mode. */
export function resolveStableMapViewTransition(
  mapMode: "2d" | "3d",
): MapViewTransition {
  if (!MAP_3D_ENABLED) return "idle";
  return mapMode === "3d" ? "ready" : "idle";
}

/** Align transition with persisted map mode without interrupting an active crossfade. */
export function syncMapViewTransitionForMode(
  mapMode: "2d" | "3d",
  current: MapViewTransition,
): MapViewTransition {
  if (current === "enteringGlobe" || current === "enteringFlat") {
    return current;
  }
  return resolveStableMapViewTransition(mapMode);
}

export function shouldShowFlatMapLayer(
  mapMode: "2d" | "3d",
  transition: MapViewTransition,
): boolean {
  return (
    mapMode === "2d" ||
    transition === "enteringGlobe" ||
    transition === "enteringFlat"
  );
}

export function shouldShowGlobeLayer(
  mapMode: "2d" | "3d",
  transition: MapViewTransition,
): boolean {
  if (!MAP_3D_ENABLED) return false;
  return (
    mapMode === "3d" ||
    transition === "enteringGlobe" ||
    transition === "enteringFlat"
  );
}

/** True when map chrome should use globe (3D) behavior — only while globe is fully active. */
export function isGlobeMapUi(
  mapMode: "2d" | "3d",
  transition: MapViewTransition,
): boolean {
  return MAP_3D_ENABLED && mapMode === "3d" && transition === "ready";
}

/** True when 2D map data/chrome should drive the experience (incl. crossfade back from globe). */
export function isFlatMapUi(
  mapMode: "2d" | "3d",
  transition: MapViewTransition,
): boolean {
  return mapMode === "2d" || transition === "enteringFlat";
}

/** Flat map pins/clusters — only while 2D is the active mode (hidden during any 3D phase). */
export function shouldShowFlatMapMarkers(mapMode: "2d" | "3d"): boolean {
  return mapMode === "2d";
}

/** Continent/country highlight fills — flat map only; globe renders its own GL layers. */
export function shouldShowFlatMapOverlays(mapMode: "2d" | "3d"): boolean {
  return mapMode === "2d";
}
