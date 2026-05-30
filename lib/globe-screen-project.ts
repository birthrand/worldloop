import type { Camera } from "three";
import * as THREE from "three";

import { latLngToVector3 } from "@/lib/latlng-to-sphere";

export const GLOBE_SURFACE_RADIUS = 1.02;
const HEMISPHERE_DOT_THRESHOLD = 0.12;

export type GlobeScreenPosition = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
};

export function isInCameraFrustum(
  projected: THREE.Vector3,
  margin = 0.15,
): boolean {
  if (projected.z <= 0 || projected.z >= 1) return false;
  const bound = 1 + margin;
  return (
    projected.x >= -bound &&
    projected.x <= bound &&
    projected.y >= -bound &&
    projected.y <= bound
  );
}

export function projectLatLngToScreen(
  lat: number,
  lng: number,
  camera: Camera,
  size: { width: number; height: number },
  radius = GLOBE_SURFACE_RADIUS,
  globeQuaternion?: THREE.Quaternion,
): { x: number; y: number; visible: boolean } {
  const surface = new THREE.Vector3(...latLngToVector3(lat, lng, radius));
  if (globeQuaternion) {
    surface.applyQuaternion(globeQuaternion);
  }
  const normal = surface.clone().normalize();
  const cameraDirection = new THREE.Vector3().copy(camera.position).normalize();

  const onVisibleHemisphere =
    normal.dot(cameraDirection) > HEMISPHERE_DOT_THRESHOLD;
  if (!onVisibleHemisphere) {
    return { x: 0, y: 0, visible: false };
  }

  const projected = surface.project(camera);
  if (!isInCameraFrustum(projected)) {
    return { x: 0, y: 0, visible: false };
  }

  return {
    x: (projected.x * 0.5 + 0.5) * size.width,
    y: (-projected.y * 0.5 + 0.5) * size.height,
    visible: true,
  };
}
