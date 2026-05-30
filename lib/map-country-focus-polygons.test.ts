import { describe, expect, it } from "vitest";

import type { CountryBoundaryPolygon } from "@/lib/map-country-boundaries";
import {
  resolveCountryFocusRenderPolygons,
  shouldFillCountryHighlightGaps,
} from "@/lib/map-country-focus-polygons";

const samplePolygon: CountryBoundaryPolygon = {
  id: "test",
  countryName: "Testland",
  continent: "Europe",
  coordinates: [
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
    { latitude: 1, longitude: 1 },
  ],
  holes: [
    [
      { latitude: 0.2, longitude: 0.2 },
      { latitude: 0.8, longitude: 0.2 },
      { latitude: 0.8, longitude: 0.8 },
    ],
  ],
};

describe("map-country-focus-polygons", () => {
  it("keeps holes when continent overlay is not active", () => {
    const result = resolveCountryFocusRenderPolygons([samplePolygon], false);
    expect(result[0]?.holes).toHaveLength(1);
  });

  it("drops holes when continent overlay is active below the highlight", () => {
    const result = resolveCountryFocusRenderPolygons([samplePolygon], true);
    expect(result[0]?.holes).toBeUndefined();
  });

  it("detects visible continent overlay from committed or preview region", () => {
    expect(shouldFillCountryHighlightGaps(null, null)).toBe(false);
    expect(shouldFillCountryHighlightGaps("Europe", null)).toBe(true);
    expect(shouldFillCountryHighlightGaps(null, "Asia")).toBe(true);
    expect(shouldFillCountryHighlightGaps("Europe", "Asia")).toBe(true);
  });
});
