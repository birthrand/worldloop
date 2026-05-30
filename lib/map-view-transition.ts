/** Visual crossfade phase when switching 2D map ↔ 3D globe (not persisted). */
export type MapViewTransition =
  | "idle"
  | "enteringGlobe"
  | "ready"
  | "enteringFlat";

export const GLOBE_CROSSFADE_MS = 300;
export const MAP_DIM_HOLD_MS = 200;

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
  return mapMode === "3d" && transition === "ready";
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
