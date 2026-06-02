import * as THREE from "three";

import { latLngToVector3, vector3ToLatLng } from "@/lib/latlng-to-sphere";

/** Atlantic-centered view — must match `INITIAL_CAMERA_POSITION` in globe-view. */
const INITIAL_VIEW_LAT = 4;
const INITIAL_VIEW_LNG = -36;

/** Idle 3D globe slowly spins when the user is not interacting. */
export const GLOBE_AUTO_ROTATE_ENABLED = true;

/** Radians per second — ~0.025 ≈ one full turn in ~4.2 minutes. */
export const GLOBE_AUTO_ROTATE_SPEED = 0.025;

/** Resume idle spin this long after the user stops dragging (default state only). */
export const GLOBE_AUTO_ROTATE_INACTIVITY_MS = 4000;

export type GlobeAutoRotateContext = {
  /** Country selected or mid-focus flight. */
  hasCountryFocus: boolean;
  /** Continent explore mode is active. */
  hasContinentFocus: boolean;
  /** Continent intent preview before commit. */
  hasContinentPreview: boolean;
};

/**
 * Idle auto-rotation runs only in the default world view (no country/continent anchor).
 * When a region or country is focused, the globe stays anchored until selection clears.
 */
export function resolveGlobeAutoRotateEnabled(
  context: GlobeAutoRotateContext,
): boolean {
  if (!GLOBE_AUTO_ROTATE_ENABLED) return false;
  return (
    !context.hasCountryFocus &&
    !context.hasContinentFocus &&
    !context.hasContinentPreview
  );
}

const scratchVector = new THREE.Vector3();
const scratchInverse = new THREE.Quaternion();

/** Unit direction from globe center toward the fixed camera (view axis). */
export const GLOBE_CAMERA_VIEW_DIRECTION = new THREE.Vector3(
  ...latLngToVector3(INITIAL_VIEW_LAT, INITIAL_VIEW_LNG, 1),
).normalize();

export function latLngToUnitSphereVector(
  lat: number,
  lng: number,
): THREE.Vector3 {
  return scratchVector
    .set(...latLngToVector3(lat, lng, 1))
    .normalize()
    .clone();
}

/**
 * Globe quaternion that places `lat/lng` on the hemisphere facing the fixed camera.
 * Applies as `quaternion * localPoint` in world space.
 */
export function quaternionForLatLngFacingCamera(
  lat: number,
  lng: number,
  viewDir: THREE.Vector3 = GLOBE_CAMERA_VIEW_DIRECTION,
): THREE.Quaternion {
  const point = latLngToUnitSphereVector(lat, lng);
  return new THREE.Quaternion().setFromUnitVectors(point, viewDir);
}

/** Lat/lng currently centered under the fixed camera for a globe orientation. */
export function viewCenterLatLngFromGlobeQuaternion(
  globeQuaternion: THREE.Quaternion,
  viewDir: THREE.Vector3 = GLOBE_CAMERA_VIEW_DIRECTION,
): [lat: number, lng: number] {
  const local = scratchVector
    .copy(viewDir)
    .applyQuaternion(scratchInverse.copy(globeQuaternion).invert());
  return vector3ToLatLng(local.x, local.y, local.z);
}

/** World-space surface point for a lat/lng after globe rotation. */
export function worldPointFromLatLng(
  lat: number,
  lng: number,
  radius: number,
  globeQuaternion: THREE.Quaternion,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  return target
    .set(...latLngToVector3(lat, lng, radius))
    .applyQuaternion(globeQuaternion);
}

/** World-space unit normal → lat/lng in globe-local coordinates. */
export function latLngFromWorldNormal(
  worldNormal: THREE.Vector3,
  globeQuaternion: THREE.Quaternion,
): [lat: number, lng: number] {
  const local = scratchVector
    .copy(worldNormal)
    .normalize()
    .applyQuaternion(scratchInverse.copy(globeQuaternion).invert());
  return vector3ToLatLng(local.x, local.y, local.z);
}

/**
 * Orbit-control camera move `prevDir → nextDir` re-expressed as globe rotation
 * (fixed camera, world spins underneath).
 */
export function globeQuaternionDeltaForCameraOrbit(
  prevDir: THREE.Vector3,
  nextDir: THREE.Vector3,
): THREE.Quaternion {
  // Camera moved prev → next; spin the globe so content under `next` lands on `prev`.
  return new THREE.Quaternion().setFromUnitVectors(
    nextDir.clone().normalize(),
    prevDir.clone().normalize(),
  );
}
