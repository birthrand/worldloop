import { describe, expect, it } from "vitest";

import { CONTINENTS } from "@/constants/regions";
import {
  filterBoundaryPolygonsByMapContext,
  getCountryBoundaryPolygons,
} from "@/lib/map-country-boundaries";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const countriesGeoJson = require("../assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

const allPolygons = getCountryBoundaryPolygons(countriesGeoJson);

function continentOnlyFilter(region: string) {
  return filterBoundaryPolygonsByMapContext(allPolygons, {
    selectedCountryName: null,
    focusedRegion: region,
    countries: [],
  });
}

describe("continent overlay polygon filter coverage", () => {
  for (const region of CONTINENTS) {
    it(`includes all Natural Earth ${region} polygons via continent fallback`, () => {
      const byContinent = allPolygons.filter((p) => {
        const allowed: Record<string, string[]> = {
          Africa: ["Africa"],
          "North America": ["North America"],
          "South America": ["South America"],
          Antarctic: ["Antarctica"],
          Asia: ["Asia"],
          Europe: ["Europe"],
          Oceania: ["Oceania"],
        };
        return p.continent && allowed[region]?.includes(p.continent);
      });

      const filtered = continentOnlyFilter(region);
      const filteredIds = new Set(filtered.map((p) => p.id));

      const missing = byContinent.filter((p) => !filteredIds.has(p.id));
      expect(missing.map((p) => p.countryName)).toEqual([]);
    });
  }
});
