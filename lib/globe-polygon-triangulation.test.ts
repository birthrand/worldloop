import { describe, expect, it } from "vitest";

import {
  ringToProjectionFlat,
  splitRingAtAntimeridian,
  triangulatePolygonFlat,
  unwrapRingLongitudes,
} from "@/lib/globe-polygon-triangulation";

describe("triangulatePolygonFlat", () => {
  it("triangulates a square", () => {
    const flat = [0, 0, 1, 0, 1, 1, 0, 1];
    const indices = triangulatePolygonFlat(flat);
    expect(indices).toHaveLength(6);
  });

  it("triangulates a concave L-shape", () => {
    const flat = [0, 0, 2, 0, 2, 1, 1, 1, 1, 2, 0, 2];
    const indices = triangulatePolygonFlat(flat);
    expect(indices.length).toBeGreaterThanOrEqual(6);
    expect(indices.length % 3).toBe(0);
  });
});

describe("splitRingAtAntimeridian", () => {
  it("returns the original ring when it does not cross the dateline", () => {
    const ring = [
      { latitude: 0, longitude: -50 },
      { latitude: 0, longitude: -40 },
      { latitude: -5, longitude: -45 },
    ];
    expect(splitRingAtAntimeridian(ring)).toEqual([ring]);
  });

  it("splits a ring that crosses the dateline into valid chains", () => {
    const ring = [
      { latitude: 10, longitude: 170 },
      { latitude: 10, longitude: -170 },
      { latitude: -10, longitude: -170 },
      { latitude: -10, longitude: 170 },
    ];
    const chains = splitRingAtAntimeridian(ring);
    expect(chains.length).toBeGreaterThanOrEqual(1);
    for (const chain of chains) {
      expect(chain.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("ringToProjectionFlat", () => {
  it("projects ring points relative to centroid", () => {
    const { flat } = ringToProjectionFlat([
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
    ]);
    expect(flat).toHaveLength(6);
  });

  it("unwraps longitudes before projection", () => {
    const unwrapped = unwrapRingLongitudes([
      { latitude: 0, longitude: 179 },
      { latitude: 0, longitude: -179 },
    ]);
    expect(unwrapped[1]!.longitude).toBe(181);
  });
});
