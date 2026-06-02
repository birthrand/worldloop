import { describe, expect, it } from "vitest";

import {
  countryNamesMatch,
  getCountryBoundaryPolygons,
} from "@/lib/map-country-boundaries";
import {
  resolveGlobeSurfaceTapCountry,
  resolveMapCountryAtCoordinate,
} from "@/lib/map-map-tap-hit";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const countriesGeoJson = require("../assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

const allPolygons = getCountryBoundaryPolygons(countriesGeoJson);
const drcCoord = { latitude: -5.88, longitude: 26.97 };

describe("globe surface tap country resolution", () => {
  it("matches REST Countries common name DR Congo to geo ADMIN label", () => {
    expect(
      countryNamesMatch("DR Congo", "Democratic Republic of the Congo"),
    ).toBe(true);
  });

  it("resolves DRC from a globe surface tap coordinate", () => {
    const countries = [
      {
        name: "DR Congo",
        region: "Africa",
        latlng: [-4, 21] as [number, number],
        population: 0,
        capital: "",
        flag: "",
        image: "",
        funFact: "",
      },
    ];

    expect(
      resolveMapCountryAtCoordinate(allPolygons, countries, drcCoord)?.name,
    ).toBe("DR Congo");
    expect(
      resolveGlobeSurfaceTapCountry(allPolygons, countries, drcCoord)?.name,
    ).toBe("DR Congo");
  });
});
