import * as THREE from "three";

import { latLngToVector3, vector3ToLatLng } from "@/lib/latlng-to-sphere";

/** Atlantic-centered view — must match `INITIAL_CAMERA_POSITION` in globe-view. */
const INITIAL_VIEW_LAT = 4;
const INITIAL_VIEW_LNG = -36;

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
  return scratchVector.set(...latLngToVector3(lat, lng, 1)).normalize();
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
