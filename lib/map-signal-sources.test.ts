import { describe, expect, it } from "vitest";

import {
  areRegionBoundariesTappable,
  canFocusContinentFromMapTap,
  canRefocusContinentFromMapTap,
  isExploreMapZoom,
  shouldDelegateMapTapToCountrySelection,
  shouldSelectCountryAcrossFocusedContinentFromMapTap,
  shouldSelectCountryInFocusedContinentFromMapTap,
  shouldShowFeaturedChipsInMapChrome,
  shouldShowMapOnboarding,
} from "@/lib/map-signal-sources";
import type { MapCountry } from "@/types/country";

const france: MapCountry = {
  name: "France",
  region: "Europe",
  capital: "Paris",
  population: 0,
  flag: "",
  latlng: [46, 2],
  images: [],
  funFact: "",
};

const spain: MapCountry = {
  name: "Spain",
  region: "Europe",
  capital: "Madrid",
  population: 0,
  flag: "",
  latlng: [40, -4],
  images: [],
  funFact: "",
};

const brazil: MapCountry = {
  name: "Brazil",
  region: "Americas",
  capital: "Brasília",
  population: 0,
  flag: "",
  latlng: [-10, -55],
  images: [],
  funFact: "",
};

describe("map signal sources", () => {
  it("isExploreMapZoom uses intent + live camera", () => {
    expect(isExploreMapZoom("Asia", "region")).toBe(true);
    expect(isExploreMapZoom("Asia", "world")).toBe(false);
    expect(isExploreMapZoom(null, "region")).toBe(false);
  });

  it("shouldDelegateMapTapToCountrySelection uses focus intent, not camera", () => {
    expect(
      shouldDelegateMapTapToCountrySelection({
        presentationMode: "focus",
        activeCountry: spain,
        focusedRegion: "Europe",
        tappedCountry: france,
      }),
    ).toBe(true);
    expect(
      shouldDelegateMapTapToCountrySelection({
        presentationMode: "focus",
        activeCountry: spain,
        focusedRegion: null,
        tappedCountry: france,
      }),
    ).toBe(true);
    expect(
      shouldDelegateMapTapToCountrySelection({
        presentationMode: "idle",
        activeCountry: spain,
        focusedRegion: "Europe",
        tappedCountry: france,
      }),
    ).toBe(false);
    expect(
      shouldDelegateMapTapToCountrySelection({
        presentationMode: "focus",
        activeCountry: null,
        focusedRegion: "Europe",
        tappedCountry: france,
      }),
    ).toBe(false);
    expect(
      shouldDelegateMapTapToCountrySelection({
        presentationMode: "focus",
        activeCountry: spain,
        focusedRegion: "Europe",
        tappedCountry: brazil,
      }),
    ).toBe(false);
  });

  it("canFocusContinentFromMapTap allows world and 3D entry", () => {
    expect(canFocusContinentFromMapTap(true, "Asia", "region")).toBe(true);
    expect(canFocusContinentFromMapTap(false, null, "world")).toBe(true);
    expect(canFocusContinentFromMapTap(false, "Asia", "region")).toBe(false);
  });

  it("shouldSelectCountryAcrossFocusedContinentFromMapTap when continents differ", () => {
    expect(
      shouldSelectCountryAcrossFocusedContinentFromMapTap({
        focusedRegion: "Europe",
        tappedCountry: brazil,
      }),
    ).toBe(true);
    expect(
      shouldSelectCountryAcrossFocusedContinentFromMapTap({
        focusedRegion: "Europe",
        tappedCountry: france,
      }),
    ).toBe(false);
    expect(
      shouldSelectCountryAcrossFocusedContinentFromMapTap({
        focusedRegion: null,
        tappedCountry: brazil,
      }),
    ).toBe(false);
  });

  it("shouldSelectCountryInFocusedContinentFromMapTap at explore or world zoom", () => {
    expect(
      shouldSelectCountryInFocusedContinentFromMapTap({
        focusedRegion: "Europe",
        tappedCountry: france,
        cameraTier: "region",
      }),
    ).toBe(true);
    expect(
      shouldSelectCountryInFocusedContinentFromMapTap({
        focusedRegion: "Europe",
        tappedCountry: france,
        cameraTier: "world",
      }),
    ).toBe(true);
    expect(
      shouldSelectCountryInFocusedContinentFromMapTap({
        focusedRegion: "Europe",
        tappedCountry: brazil,
        cameraTier: "world",
      }),
    ).toBe(false);
    expect(
      shouldSelectCountryInFocusedContinentFromMapTap({
        focusedRegion: null,
        tappedCountry: france,
        cameraTier: "world",
      }),
    ).toBe(false);
  });

  it("canRefocusContinentFromMapTap blocks same continent at world zoom", () => {
    expect(canRefocusContinentFromMapTap("Europe", "Europe", "world")).toBe(
      false,
    );
    expect(canRefocusContinentFromMapTap("Europe", "Asia", "world")).toBe(true);
    expect(canRefocusContinentFromMapTap("Europe", "Europe", "region")).toBe(
      true,
    );
  });

  it("shouldShowFeaturedChipsInMapChrome follows live camera at continent zoom", () => {
    expect(shouldShowFeaturedChipsInMapChrome(false, "region", "Asia")).toBe(
      false,
    );
    expect(shouldShowFeaturedChipsInMapChrome(false, "world", "Asia")).toBe(
      true,
    );
    expect(shouldShowFeaturedChipsInMapChrome(true, "region", "Asia")).toBe(
      true,
    );
  });

  it("areRegionBoundariesTappable matches explore zoom", () => {
    expect(areRegionBoundariesTappable("Europe", "region")).toBe(true);
    expect(areRegionBoundariesTappable("Europe", "world")).toBe(false);
    expect(areRegionBoundariesTappable(null, "region")).toBe(false);
  });

  it("shouldShowMapOnboarding requires world-scale camera", () => {
    expect(
      shouldShowMapOnboarding({
        is3d: false,
        cameraTier: "world",
        status: "ready",
        countryCount: 10,
        hasActiveCountry: false,
        hasFocusTransition: false,
      }),
    ).toBe(true);
    expect(
      shouldShowMapOnboarding({
        is3d: false,
        cameraTier: "region",
        status: "ready",
        countryCount: 10,
        hasActiveCountry: false,
        hasFocusTransition: false,
      }),
    ).toBe(false);
  });
});
