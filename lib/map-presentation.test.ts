import { describe, expect, it } from "vitest";

import {
  canSelectCountryOnMap,
  canSelectCountryOnMapBoundary,
  isExploreMapHandoff,
  isFlatSingleCountryFlagMode,
} from "@/lib/map-presentation";
import type { MapCountry } from "@/types/country";

const japan: MapCountry = {
  name: "Japan",
  population: 125_000_000,
  region: "Asia",
  capital: "Tokyo",
  flag: "https://flagcdn.com/w320/jp.png",
  latlng: [36, 138],
  image: null,
};

const korea: MapCountry = {
  name: "South Korea",
  population: 51_000_000,
  region: "Asia",
  capital: "Seoul",
  flag: "https://flagcdn.com/w320/kr.png",
  latlng: [37, 127],
  image: null,
};

describe("isExploreMapHandoff", () => {
  it("is true for committed, pending, and session explore handoffs", () => {
    expect(isExploreMapHandoff("explore", null)).toBe(true);
    expect(isExploreMapHandoff(null, "explore")).toBe(true);
    expect(isExploreMapHandoff(null, null, true)).toBe(true);
    expect(isExploreMapHandoff("countryDetail", null)).toBe(false);
    expect(isExploreMapHandoff("countryDetail", null, true)).toBe(false);
  });
});

describe("canSelectCountryOnMapBoundary", () => {
  it("allows switching countries during explore handoff", () => {
    expect(canSelectCountryOnMapBoundary(japan, korea.name, "explore")).toBe(
      true,
    );
    expect(canSelectCountryOnMapBoundary(japan, korea.name, null, true)).toBe(
      true,
    );
  });

  it("keeps country detail handoff locked to the active country", () => {
    expect(
      canSelectCountryOnMapBoundary(japan, korea.name, "countryDetail"),
    ).toBe(false);
    expect(
      canSelectCountryOnMapBoundary(japan, japan.name, "countryDetail"),
    ).toBe(true);
  });
});

describe("isFlatSingleCountryFlagMode", () => {
  it("is true on 2D for explore and country detail selections only", () => {
    expect(isFlatSingleCountryFlagMode(false, "explore", true, japan)).toBe(
      true,
    );
    expect(
      isFlatSingleCountryFlagMode(false, "countryDetail", false, japan),
    ).toBe(true);
    expect(
      isFlatSingleCountryFlagMode(true, "countryDetail", false, japan),
    ).toBe(false);
    expect(isFlatSingleCountryFlagMode(false, "mapTap", false, japan)).toBe(
      false,
    );
    expect(isFlatSingleCountryFlagMode(false, "explore", true, null)).toBe(
      false,
    );
  });
});

describe("canSelectCountryOnMap", () => {
  it("still locks marker selection to the active country", () => {
    expect(canSelectCountryOnMap(japan, korea.name)).toBe(false);
    expect(canSelectCountryOnMap(japan, japan.name)).toBe(true);
  });
});
