import { describe, expect, it } from "vitest";

import { resolveExternalMapFocusEligibility } from "@/lib/map-external-focus";
import { createMapPresentationIntent } from "@/lib/map-navigation-intent";

describe("resolveExternalMapFocusEligibility", () => {
  const intent = createMapPresentationIntent({
    countryName: "France",
    mode: "focus",
    source: "explore",
  });

  it("defers until countries are loaded when the target country is missing", () => {
    expect(
      resolveExternalMapFocusEligibility({
        intent,
        countriesFullyLoaded: false,
        countryFound: false,
        useGlobeCamera: false,
        flatMapReady: true,
        globeReady: false,
      }),
    ).toEqual({ eligible: false, deferReason: "countries_loading" });
  });

  it("allows handoff when the target country is already injected", () => {
    expect(
      resolveExternalMapFocusEligibility({
        intent,
        countriesFullyLoaded: false,
        countryFound: true,
        useGlobeCamera: false,
        flatMapReady: true,
        globeReady: false,
      }),
    ).toEqual({ eligible: true });
  });

  it("does not dedupe by intent id — readiness only", () => {
    expect(
      resolveExternalMapFocusEligibility({
        intent,
        countriesFullyLoaded: true,
        countryFound: true,
        useGlobeCamera: false,
        flatMapReady: true,
        globeReady: false,
      }),
    ).toEqual({ eligible: true });
  });
});
