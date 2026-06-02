import { describe, expect, it } from "vitest";

import {
  GLOBE_DETAIL_CAMERA_DISTANCE,
  GLOBE_REGION_CAMERA_DISTANCE,
  GLOBE_WORLD_CAMERA_DISTANCE,
  resolveGlobeCountryTargetDistance,
} from "@/lib/map-region-markers";

describe("resolveGlobeCountryTargetDistance", () => {
  it("uses detail distance for preview", () => {
    expect(resolveGlobeCountryTargetDistance("preview", "mapTap", 4)).toBe(
      GLOBE_DETAIL_CAMERA_DISTANCE,
    );
  });

  it("uses world distance for fab and explore", () => {
    expect(resolveGlobeCountryTargetDistance("focus", "fab", 2)).toBe(
      GLOBE_WORLD_CAMERA_DISTANCE,
    );
    expect(resolveGlobeCountryTargetDistance("focus", "explore", 2)).toBe(
      GLOBE_WORLD_CAMERA_DISTANCE,
    );
  });

  it("preserves pinch zoom on mapTap when already closer than region framing", () => {
    expect(
      resolveGlobeCountryTargetDistance("focus", "mapTap", 1.8),
    ).toBeUndefined();
  });

  it("frames region on mapTap when zoomed out past region distance", () => {
    expect(resolveGlobeCountryTargetDistance("focus", "mapTap", 3.5)).toBe(
      GLOBE_REGION_CAMERA_DISTANCE,
    );
  });
});
