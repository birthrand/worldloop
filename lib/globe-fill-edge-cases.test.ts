import { describe, expect, it } from "vitest";

import { buildGlobeBoundaryFills } from "@/lib/globe-boundary-fills";
import {
  polygonRingsToFlat,
  splitRingAtAntimeridian,
  triangulatePolygonFlat,
  triangulatePolygonWithHolesFlat,
} from "@/lib/globe-polygon-triangulation";
import { getCountryBoundaryPolygons } from "@/lib/map-country-boundaries";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const countriesGeoJson = require("../assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

const allPolygons = getCountryBoundaryPolygons(countriesGeoJson);

function lngSpan(ring: { longitude: number }[]): number {
  const lngs = ring.map((point) => point.longitude);
  return Math.max(...lngs) - Math.min(...lngs);
}

describe("globe fill edge cases", () => {
  it("flags dateline rings that never split into multiple chains", () => {
    const unsplit = allPolygons.filter((polygon) => {
      if (polygon.countryName === "Antarctica") return false;
      if (lngSpan(polygon.coordinates) <= 180) return false;
      const chains = splitRingAtAntimeridian(polygon.coordinates);
      return chains.length === 1;
    });

    expect(
      unsplit.map((polygon) => polygon.countryName),
      "dateline-spanning polygons should split before triangulation",
    ).toEqual([]);
  });

  it("triangulates polygons with holes on every chain path", () => {
    const withHoles = allPolygons.filter(
      (polygon) => (polygon.holes?.length ?? 0) > 0,
    );

    expect(withHoles.length).toBeGreaterThan(0);

    for (const polygon of withHoles) {
      const fills = buildGlobeBoundaryFills([polygon]);
      expect(fills.length, polygon.countryName ?? polygon.id).toBeGreaterThan(
        0,
      );

      const chains = splitRingAtAntimeridian(polygon.coordinates);
      if (chains.length === 1) {
        const { flat, holeIndices } = polygonRingsToFlat(
          chains[0]!,
          polygon.holes ?? [],
        );
        const indices =
          holeIndices.length > 0
            ? triangulatePolygonWithHolesFlat(flat, holeIndices)
            : triangulatePolygonFlat(flat);
        expect(
          indices.length,
          polygon.countryName ?? polygon.id,
        ).toBeGreaterThan(0);
      }
    }
  });
});
