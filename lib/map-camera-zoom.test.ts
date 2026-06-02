import { describe, expect, it } from "vitest";

import {
  resolveGlobeContinentTargetDistance,
  resolveGlobeDistanceFromLatitudeDelta,
} from "@/lib/map-camera-zoom";
import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  GLOBE_REGION_CAMERA_DISTANCE,
  GLOBE_WORLD_CAMERA_DISTANCE,
} from "@/lib/map-region-markers";

describe("resolveGlobeDistanceFromLatitudeDelta", () => {
  it("maps world-scale flat zoom to world globe distance", () => {
    expect(resolveGlobeDistanceFromLatitudeDelta(120)).toBe(
      GLOBE_WORLD_CAMERA_DISTANCE,
    );
  });

  it("maps region-scale flat zoom to region globe distance", () => {
    expect(resolveGlobeDistanceFromLatitudeDelta(45)).toBe(
      GLOBE_REGION_CAMERA_DISTANCE,
    );
  });

  it("maps country-scale flat zoom to detail globe distance", () => {
    expect(resolveGlobeDistanceFromLatitudeDelta(18)).toBe(
      GLOBE_DETAIL_CAMERA_DISTANCE,
    );
  });
});

describe("resolveGlobeContinentTargetDistance", () => {
  it("caps continent framing at region distance when flat map is at world zoom", () => {
    expect(resolveGlobeContinentTargetDistance(120)).toBe(
      GLOBE_REGION_CAMERA_DISTANCE,
    );
  });

  it("preserves closer flat zoom when already inside region framing", () => {
    expect(resolveGlobeContinentTargetDistance(18)).toBe(
      GLOBE_DETAIL_CAMERA_DISTANCE,
    );
  });
});
