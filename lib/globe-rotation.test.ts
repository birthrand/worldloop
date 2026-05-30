import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  GLOBE_CAMERA_VIEW_DIRECTION,
  latLngFromWorldNormal,
  quaternionForLatLngFacingCamera,
  viewCenterLatLngFromGlobeQuaternion,
  worldPointFromLatLng,
} from "@/lib/globe-rotation";
import { latLngToVector3 } from "@/lib/latlng-to-sphere";

describe("globe-rotation", () => {
  it("rotates a target lat/lng under the fixed camera view axis", () => {
    const quat = quaternionForLatLngFacingCamera(35, 139);
    const world = worldPointFromLatLng(35, 139, 1, quat);

    expect(world.angleTo(GLOBE_CAMERA_VIEW_DIRECTION)).toBeLessThan(0.02);
  });

  it("reports the centered lat/lng from the globe quaternion", () => {
    const quat = quaternionForLatLngFacingCamera(-33, 151);
    const [lat, lng] = viewCenterLatLngFromGlobeQuaternion(quat);

    expect(lat).toBeCloseTo(-33, 0);
    expect(lng).toBeCloseTo(151, 0);
  });

  it("maps a world surface tap back to globe-local lat/lng", () => {
    const quat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 4,
    );
    const local = new THREE.Vector3(...latLngToVector3(10, 20, 1));
    const world = local.clone().applyQuaternion(quat);
    const [lat, lng] = latLngFromWorldNormal(world, quat);

    expect(lat).toBeCloseTo(10, 0);
    expect(lng).toBeCloseTo(20, 0);
  });
});
