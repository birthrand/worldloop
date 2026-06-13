import { beforeEach, describe, expect, it } from "vitest";

import {
  createInitialTransitionMemory,
  getTransitionMemory,
  recordTransitionResolved,
  resetTransitionMemoryForTests,
  resolveMapTransition,
} from "@/lib/map-transition-engine";
import type { MapCountry } from "@/types/country";

const mozambique = { name: "Mozambique", region: "Africa" } as MapCountry;

describe("resolveMapTransition", () => {
  beforeEach(() => {
    resetTransitionMemoryForTests();
  });

  it("animates on first countryDetail entry when camera is uninitialized", () => {
    const plan = resolveMapTransition(
      { country: mozambique, mode: "focus", source: "countryDetail" },
      { cluster: null, useGlobeCamera: false },
    );

    expect(plan.shouldAnimate).toBe(true);
    expect(plan.flightDuration).toBe(900);
    expect(plan.memoryRecord).toBe("onComplete");
    expect(plan.metadata.isRepeatVisit).toBe(false);
    expect(plan.metadata.reason).toBe("first countryDetail entry");
  });

  it("animates when the target country changed", () => {
    recordTransitionResolved("Mozambique");
    const plan = resolveMapTransition(
      {
        country: { name: "France", region: "Europe" } as MapCountry,
        mode: "focus",
        source: "countryDetail",
      },
      { cluster: null, useGlobeCamera: false },
    );

    expect(plan.shouldAnimate).toBe(true);
    expect(plan.metadata.reason).toBe(
      "country changed from last countryDetail visit",
    );
  });

  it("snaps instantly when reopening the same country from detail", () => {
    recordTransitionResolved("Mozambique");
    const plan = resolveMapTransition(
      { country: mozambique, mode: "focus", source: "countryDetail" },
      { cluster: null, useGlobeCamera: false },
    );

    expect(plan.shouldAnimate).toBe(false);
    expect(plan.flightDuration).toBe(0);
    expect(plan.memoryRecord).toBe("immediate");
    expect(plan.metadata.isRepeatVisit).toBe(true);
    expect(plan.metadata.reason).toBe(
      "repeat visit to same country from detail",
    );
  });

  it("uses globe duration for countryDetail on 3D map", () => {
    const plan = resolveMapTransition(
      { country: mozambique, mode: "focus", source: "countryDetail" },
      { cluster: null, useGlobeCamera: true },
    );

    expect(plan.flightDuration).toBe(1100);
  });

  it("does not record memory for in-map taps", () => {
    const plan = resolveMapTransition(
      { country: mozambique, mode: "focus", source: "mapTap" },
      { cluster: null, useGlobeCamera: false },
    );

    expect(plan.shouldAnimate).toBe(true);
    expect(plan.memoryRecord).toBe("none");
    expect(plan.metadata.reason).toBe("mapTap navigation");
  });

  it("records resolved country into session memory", () => {
    recordTransitionResolved("Mozambique");
    expect(getTransitionMemory()).toEqual({
      countryDetailInitialized: true,
      lastCountryDetailResolvedName: "Mozambique",
    });
  });

  it("starts from a clean memory snapshot", () => {
    expect(createInitialTransitionMemory()).toEqual({
      countryDetailInitialized: false,
      lastCountryDetailResolvedName: null,
    });
  });
});
