import { describe, expect, it } from "vitest";

import {
  isExplicitCountryFocusSource,
  shouldSyncFocusedRegionForCountry,
  shouldSyncFocusedRegionForSelectionSource,
} from "@/lib/map-region-focus";

const brazil = { region: "Americas" };
const france = { region: "Europe" };

describe("map region focus", () => {
  it("adopts country continent when no exploration intent exists", () => {
    expect(shouldSyncFocusedRegionForCountry(brazil, null)).toBe(true);
  });

  it("stays aligned when country matches focused exploration", () => {
    expect(shouldSyncFocusedRegionForCountry(france, "Europe")).toBe(true);
  });

  it("does not overwrite focused exploration on incidental cross-region selection", () => {
    expect(shouldSyncFocusedRegionForCountry(brazil, "Europe")).toBe(false);
    expect(
      shouldSyncFocusedRegionForCountry(brazil, "Europe", {
        explicitFocus: false,
      }),
    ).toBe(false);
  });

  it("allows cross-region overwrite on explicit navigation", () => {
    expect(
      shouldSyncFocusedRegionForCountry(brazil, "Europe", {
        explicitFocus: true,
      }),
    ).toBe(true);
  });

  it("maps selection sources to explicit vs incidental sync", () => {
    expect(
      shouldSyncFocusedRegionForSelectionSource(brazil, "Europe", "mapTap"),
    ).toBe(false);
    expect(
      shouldSyncFocusedRegionForSelectionSource(brazil, "Europe", "search"),
    ).toBe(true);
    expect(
      shouldSyncFocusedRegionForSelectionSource(brazil, null, "mapTap"),
    ).toBe(true);
    expect(shouldSyncFocusedRegionForSelectionSource(brazil, null, "fab")).toBe(
      false,
    );
  });

  it("flags external entry sources as explicit focus", () => {
    expect(isExplicitCountryFocusSource("search")).toBe(true);
    expect(isExplicitCountryFocusSource("explore")).toBe(true);
    expect(isExplicitCountryFocusSource("shuffle")).toBe(true);
    expect(isExplicitCountryFocusSource("mapTap")).toBe(false);
    expect(isExplicitCountryFocusSource("fab")).toBe(false);
  });
});
