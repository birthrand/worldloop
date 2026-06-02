import { describe, expect, it } from "vitest";

import {
  bboxContainsPoint,
  bboxesIntersect,
  countriesInBBox,
  rankCountriesByViewportCenter,
} from "@/lib/spatial-query";
import type { GeoEntity } from "@/types/geo";

function entity(
  name: string,
  centroid: [number, number],
  bbox: GeoEntity["bbox"],
): GeoEntity {
  return {
    kind: "country",
    id: name.toLowerCase(),
    name,
    cca2: "XX",
    region: "Test",
    centroid,
    bbox,
  };
}

describe("bboxContainsPoint", () => {
  const europeSlice = { west: -10, south: 35, east: 40, north: 70 };

  it("returns true for a point inside the bbox", () => {
    expect(bboxContainsPoint(europeSlice, 48.8, 2.3)).toBe(true);
  });

  it("returns false for a point outside the bbox", () => {
    expect(bboxContainsPoint(europeSlice, -34.6, -58.4)).toBe(false);
  });
});

describe("countriesInBBox", () => {
  const index: GeoEntity[] = [
    entity("France", [46.2, 2.2], { west: -5, south: 41, east: 10, north: 51 }),
    entity("Brazil", [-14.2, -51.9], {
      west: -74,
      south: -34,
      east: -34,
      north: 5,
    }),
    entity("Fiji", [-17.7, 178], {
      west: 177,
      south: -21,
      east: -178,
      north: -12,
    }),
  ];

  it("returns the expected count for a Europe slice", () => {
    const europeBox = { west: -10, south: 35, east: 40, north: 70 };
    const matches = countriesInBBox(index, europeBox);
    expect(matches.map((c) => c.name)).toEqual(["France"]);
  });

  it("keeps Pacific matches when the query bbox crosses the antimeridian", () => {
    const pacificWrap = { west: 170, south: -25, east: -170, north: -10 };
    const matches = countriesInBBox(index, pacificWrap);
    expect(matches.map((c) => c.name)).toContain("Fiji");
  });
});

describe("bboxesIntersect", () => {
  it("detects intersection across the antimeridian", () => {
    const fiji = { west: 177, south: -21, east: -178, north: -12 };
    const viewport = { west: 170, south: -25, east: -170, north: -10 };
    expect(bboxesIntersect(fiji, viewport)).toBe(true);
  });
});

describe("rankCountriesByViewportCenter", () => {
  it("ranks the closer centroid first", () => {
    const matches: GeoEntity[] = [
      entity("Spain", [40, -4], { west: -10, south: 36, east: 5, north: 44 }),
      entity("Germany", [51, 10], {
        west: 5,
        south: 47,
        east: 15,
        north: 55,
      }),
    ];

    const ranked = rankCountriesByViewportCenter(matches, { lat: 48, lng: 2 });
    expect(ranked[0]?.name).toBe("Germany");
    expect(ranked[1]?.name).toBe("Spain");
  });

  it("tie-breaks by population when centroids are equally close", () => {
    const center = { lat: 50, lng: 10 };
    const sharedCentroid: [number, number] = [50, 10];
    const matches: GeoEntity[] = [
      entity("Small", sharedCentroid, {
        west: 9,
        south: 49,
        east: 11,
        north: 51,
      }),
      entity("Large", sharedCentroid, {
        west: 9,
        south: 49,
        east: 11,
        north: 51,
      }),
    ];

    const ranked = rankCountriesByViewportCenter(matches, center, {
      Small: 1_000_000,
      Large: 80_000_000,
    });

    expect(ranked[0]?.name).toBe("Large");
  });
});
