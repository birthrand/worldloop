import { describe, expect, it } from "vitest";

import {
  bboxFromLatLngPoints,
  mergeBBoxes,
} from "@/lib/map-country-boundaries";
import { bboxesIntersect } from "@/lib/spatial-query";

describe("bboxFromLatLngPoints", () => {
  it("returns null for empty input", () => {
    expect(bboxFromLatLngPoints([])).toBeNull();
  });

  it("returns a point bbox for a single coordinate", () => {
    expect(bboxFromLatLngPoints([{ latitude: -12, longitude: 177 }])).toEqual({
      west: 177,
      south: -12,
      east: 177,
      north: -12,
    });
  });

  it("returns a normal bbox when the ring does not cross the antimeridian", () => {
    expect(
      bboxFromLatLngPoints([
        { latitude: 0, longitude: 10 },
        { latitude: 5, longitude: 30 },
      ]),
    ).toEqual({ west: 10, south: 0, east: 30, north: 5 });
  });

  it("returns a wrapped bbox when the raw longitude span exceeds 180 degrees", () => {
    const bbox = bboxFromLatLngPoints([
      { latitude: -20, longitude: 179 },
      { latitude: -18, longitude: -179 },
      { latitude: -16, longitude: 178 },
    ]);

    expect(bbox).not.toBeNull();
    expect(bbox!.west).toBeGreaterThan(bbox!.east);
    expect(
      bboxesIntersect(bbox!, { west: 177, south: -21, east: -178, north: -12 }),
    ).toBe(true);
  });
});

describe("mergeBBoxes", () => {
  it("merges overlapping normal boxes", () => {
    const merged = mergeBBoxes(
      { west: 0, south: 10, east: 20, north: 30 },
      { west: 10, south: 5, east: 40, north: 25 },
    );

    expect(merged).toEqual({ west: 0, south: 5, east: 40, north: 30 });
  });

  it("keeps the shorter non-wrapped span for disjoint normal boxes", () => {
    const merged = mergeBBoxes(
      { west: 0, south: 0, east: 10, north: 10 },
      { west: 20, south: 0, east: 30, north: 10 },
    );

    expect(merged).toEqual({ west: 0, south: 0, east: 30, north: 10 });
  });

  it("returns a wrapped union across the antimeridian", () => {
    const merged = mergeBBoxes(
      { west: 177, south: -21, east: -178, north: -12 },
      { west: 170, south: -25, east: -170, north: -10 },
    );

    expect(merged.west).toBeGreaterThan(merged.east);
    expect(merged.south).toBe(-25);
    expect(merged.north).toBe(-10);
    expect(
      bboxesIntersect(merged, {
        west: 177,
        south: -21,
        east: -178,
        north: -12,
      }),
    ).toBe(true);
  });
});
