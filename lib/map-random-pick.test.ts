import { describe, expect, it } from "vitest";

import { buildSpatialDiscoveryPool } from "@/lib/spatial-discovery-pool";
import type { MapCountry } from "@/types/country";
import type { GeoEntity } from "@/types/geo";

function mapCountry(name: string, region: string): MapCountry {
  return {
    name,
    region,
    population: 1_000_000,
    capital: "Capital",
    flag: "",
    latlng: [0, 0],
    image: null,
  };
}

function entity(name: string, region: string): GeoEntity {
  return {
    kind: "country",
    id: name.toLowerCase(),
    name,
    cca2: "XX",
    region,
    centroid: [0, 0],
    bbox: { west: -1, south: -1, east: 1, north: 1 },
  };
}

describe("buildSpatialDiscoveryPool", () => {
  const allCountries = [
    mapCountry("Japan", "Asia"),
    mapCountry("France", "Europe"),
    mapCountry("Brazil", "South America"),
    mapCountry("China", "Asia"),
  ];

  it("prefers viewport countries when tier is not world", () => {
    const pool = buildSpatialDiscoveryPool({
      viewportCountries: [entity("Japan", "Asia"), entity("China", "Asia")],
      focusedRegion: null,
      allCountries,
      tier: "continent",
    });

    expect(pool.map((country) => country.name)).toEqual(["Japan", "China"]);
  });

  it("falls back to focused region when viewport is empty", () => {
    const pool = buildSpatialDiscoveryPool({
      viewportCountries: [],
      focusedRegion: "Europe",
      allCountries,
      tier: "continent",
    });

    expect(pool.map((country) => country.name)).toEqual(["France"]);
  });

  it("falls back to focused region when viewport entities do not resolve", () => {
    const oceaniaCountries = [
      ...allCountries,
      mapCountry("Fiji", "Oceania"),
      mapCountry("Samoa", "Oceania"),
    ];

    const pool = buildSpatialDiscoveryPool({
      viewportCountries: [entity("Atlantis", "Oceania")],
      focusedRegion: "Oceania",
      allCountries: oceaniaCountries,
      tier: "continent",
    });

    expect(pool.map((country) => country.name)).toEqual(["Fiji", "Samoa"]);
  });

  it("uses world pool at world tier without viewport or region", () => {
    const pool = buildSpatialDiscoveryPool({
      viewportCountries: [],
      focusedRegion: null,
      allCountries,
      tier: "world",
    });

    expect(pool).toHaveLength(4);
  });

  it("prefers unvisited countries when requested", () => {
    const pool = buildSpatialDiscoveryPool({
      viewportCountries: [entity("Japan", "Asia"), entity("China", "Asia")],
      focusedRegion: null,
      allCountries,
      tier: "country",
      visitedNames: new Set(["Japan"]),
      preferUnvisited: true,
    });

    expect(pool.map((country) => country.name)).toEqual(["China"]);
  });
});
