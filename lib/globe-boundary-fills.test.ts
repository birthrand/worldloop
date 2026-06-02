import { describe, expect, it } from "vitest";

import { CONTINENTS } from "@/constants/regions";
import { buildGlobeBoundaryFills } from "@/lib/globe-boundary-fills";
import { splitRingAtAntimeridian } from "@/lib/globe-polygon-triangulation";
import {
  filterBoundaryPolygonsByMapContext,
  getCountryBoundaryPolygons,
} from "@/lib/map-country-boundaries";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const countriesGeoJson = require("../assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

const allPolygons = getCountryBoundaryPolygons(countriesGeoJson);

function polygonsWithFailedFills(
  polygons: ReturnType<typeof getCountryBoundaryPolygons>,
) {
  const failed: { id: string; country: string | null; verts: number }[] = [];

  for (const polygon of polygons) {
    const fills = buildGlobeBoundaryFills([polygon]);
    if (fills.length === 0) {
      failed.push({
        id: polygon.id,
        country: polygon.countryName,
        verts: polygon.coordinates.length,
      });
    }
  }

  return failed;
}

describe("buildGlobeBoundaryFills coverage", () => {
  it("triangulates every Natural Earth country polygon", () => {
    const failed = polygonsWithFailedFills(allPolygons);
    expect(failed).toEqual([]);
  });

  it("splits dateline-spanning rings into multiple fill meshes when needed", () => {
    const dateline = allPolygons.filter((polygon) => {
      const lngs = polygon.coordinates.map((point) => point.longitude);
      return Math.max(...lngs) - Math.min(...lngs) > 180;
    });

    expect(dateline.length).toBeGreaterThan(0);

    for (const polygon of dateline) {
      const chains = splitRingAtAntimeridian(polygon.coordinates);
      const fills = buildGlobeBoundaryFills([polygon]);
      expect(fills.length, polygon.countryName ?? polygon.id).toBeGreaterThan(
        0,
      );
      if (chains.length > 1) {
        expect(
          fills.length,
          `${polygon.countryName} should emit one mesh per chain`,
        ).toBeGreaterThanOrEqual(chains.length);
      }
    }
  });

  it("triangulates every polygon in each continent filter (continent fallback only)", () => {
    for (const region of CONTINENTS) {
      const filtered = filterBoundaryPolygonsByMapContext(allPolygons, {
        selectedCountryName: null,
        focusedRegion: region,
        countries: [],
      });
      const failed = polygonsWithFailedFills(filtered);
      expect(failed, `region=${region}`).toEqual([]);
    }
  });

  it("triangulates selected-country highlight meshes (e.g. United States)", () => {
    const usPolygons = filterBoundaryPolygonsByMapContext(allPolygons, {
      selectedCountryName: "United States of America",
      focusedRegion: null,
      countries: [],
    });
    expect(usPolygons.length).toBeGreaterThan(0);

    const fills = buildGlobeBoundaryFills(usPolygons);
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) {
      const index = fill.geometry.getIndex();
      expect(index?.count ?? 0).toBeGreaterThan(0);
    }
  });
});
