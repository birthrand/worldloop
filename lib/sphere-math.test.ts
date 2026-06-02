import { describe, expect, it } from "vitest";

import {
  buildGreatCircleChainPositions,
  greatCircleSegmentCount,
  latLngToUnitVector,
  slerpUnit,
} from "@/lib/sphere-math";
import type { LatLng } from "react-native-maps";

describe("slerpUnit", () => {
  it("returns endpoints at t=0 and t=1", () => {
    const a = latLngToUnitVector(0, 0);
    const b = latLngToUnitVector(0, 90);

    const start = slerpUnit(a, b, 0);
    const end = slerpUnit(a, b, 1);

    expect(start.x).toBeCloseTo(a.x, 5);
    expect(end.x).toBeCloseTo(b.x, 5);
  });
});

describe("buildGreatCircleChainPositions", () => {
  it("subdivides long edges into more than two vertices", () => {
    const chain: LatLng[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 90 },
    ];
    const positions = buildGreatCircleChainPositions(chain, 1);

    expect(positions.length).toBeGreaterThan(6);
    expect(positions.length % 3).toBe(0);
  });
});

describe("greatCircleSegmentCount", () => {
  it("uses at least one segment for coincident points", () => {
    const v = latLngToUnitVector(10, 20);
    expect(greatCircleSegmentCount(v, v)).toBe(1);
  });
});
