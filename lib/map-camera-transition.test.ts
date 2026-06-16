import { beforeEach, describe, expect, it } from "vitest";

import {
  createInitialCameraTransitionMemory,
  getCameraTransitionMemory,
  recordCountryDetailCameraResolved,
  resetCameraTransitionMemoryForTests,
  resolveCountryDetailCameraTransition,
} from "@/lib/map-camera-transition";

describe("resolveCountryDetailCameraTransition", () => {
  beforeEach(() => {
    resetCameraTransitionMemoryForTests();
  });

  it("animates on first countryDetail entry when camera is uninitialized", () => {
    const memory = createInitialCameraTransitionMemory();
    expect(
      resolveCountryDetailCameraTransition({
        countryName: "Mozambique",
        memory,
      }),
    ).toEqual({ shouldAnimate: true });
  });

  it("animates when the target country changed", () => {
    const memory = {
      countryDetailInitialized: true,
      lastCountryDetailResolvedName: "Mozambique",
      exploreHandoffInitialized: false,
    };
    expect(
      resolveCountryDetailCameraTransition({
        countryName: "France",
        memory,
      }),
    ).toEqual({ shouldAnimate: true });
  });

  it("snaps instantly when reopening the same country from detail", () => {
    const memory = {
      countryDetailInitialized: true,
      lastCountryDetailResolvedName: "Mozambique",
      exploreHandoffInitialized: false,
    };
    expect(
      resolveCountryDetailCameraTransition({
        countryName: "Mozambique",
        memory,
      }),
    ).toEqual({ shouldAnimate: false });
  });

  it("records resolved country into session memory", () => {
    recordCountryDetailCameraResolved("Mozambique");
    expect(getCameraTransitionMemory()).toEqual({
      countryDetailInitialized: true,
      lastCountryDetailResolvedName: "Mozambique",
      exploreHandoffInitialized: false,
    });
  });
});
