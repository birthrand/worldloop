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

export function projectLatLngToScreen(
  lat: number,
  lng: number,
  camera: Camera,
  size: { width: number; height: number },
  radius = GLOBE_SURFACE_RADIUS,
): { x: number; y: number; visible: boolean } {
  const surface = new THREE.Vector3(...latLngToVector3(lat, lng, radius));
  const normal = surface.clone().normalize();
  const cameraDirection = new THREE.Vector3()
    .copy(camera.position)
    .normalize();

  const visible = normal.dot(cameraDirection) > HEMISPHERE_DOT_THRESHOLD;
  if (!visible) {
    return { x: 0, y: 0, visible: false };
  }

  const projected = surface.project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * size.width,
    y: (-projected.y * 0.5 + 0.5) * size.height,
    visible: true,
  };
}
