import { describe, expect, it } from "vitest";

import { resolveExternalMapFocusEligibility } from "@/lib/map-external-focus";
import {
  resolveFlatTransitionRestore,
  resolveMapModeTogglePending,
} from "@/lib/map-mode-transition";
import {
  isRandomPickGenerationCurrent,
  RANDOM_FAB_TAP_COOLDOWN_MS,
  shouldAcceptRandomFabTap,
} from "@/lib/map-random-fab";
import {
  EXPLICIT_REGION_RELEASE_DISTANCE_DEGREES,
  resolveRegionSettleDecision,
  shouldCommitScheduledRegionSwitch,
} from "@/lib/map-region-settle";

const intent = {
  countryName: "Japan",
  mode: "focus" as const,
  source: "explore" as const,
};

describe("resolveRegionSettleDecision", () => {
  it("skips while the flat map is animating", () => {
    expect(
      resolveRegionSettleDecision({
        latitudeDelta: 24,
        mapCenter: { latitude: 35, longitude: 139 },
        is3d: false,
        isMapAnimating: true,
        suppressWorldReset: false,
        explicitLock: null,
        currentFocusedRegion: "Asia",
        nearestRegion: "Asia",
        pendingCandidate: null,
      }),
    ).toEqual({ kind: "skip", reason: "animating" });
  });

  it("resets world state when zooming out unless suppressed", () => {
    expect(
      resolveRegionSettleDecision({
        latitudeDelta: 120,
        mapCenter: { latitude: 20, longitude: 0 },
        is3d: false,
        isMapAnimating: false,
        suppressWorldReset: false,
        explicitLock: { region: "Asia", anchor: [35, 105] },
        currentFocusedRegion: "Asia",
        nearestRegion: "Asia",
        pendingCandidate: null,
      }),
    ).toEqual({
      kind: "world_tier",
      clearPending: true,
      resetWorld: true,
      clearSuppressWorldReset: false,
    });
  });

  it("holds an explicit region lock until the camera moves far enough", () => {
    const decision = resolveRegionSettleDecision({
      latitudeDelta: 24,
      mapCenter: { latitude: 35, longitude: 120 },
      is3d: false,
      isMapAnimating: false,
      suppressWorldReset: true,
      explicitLock: { region: "Asia", anchor: [35, 105] },
      currentFocusedRegion: "Asia",
      nearestRegion: "Europe",
      pendingCandidate: null,
    });

    expect(decision).toMatchObject({
      kind: "explore_tier",
      holdExplicitLock: true,
      scheduleRegionSwitch: null,
    });
  });

  it("schedules a hysteresis region switch for a new nearest continent", () => {
    expect(
      resolveRegionSettleDecision({
        latitudeDelta: 24,
        mapCenter: { latitude: 48, longitude: 2 },
        is3d: false,
        isMapAnimating: false,
        suppressWorldReset: false,
        explicitLock: null,
        currentFocusedRegion: "Asia",
        nearestRegion: "Europe",
        pendingCandidate: null,
      }),
    ).toMatchObject({
      kind: "explore_tier",
      scheduleRegionSwitch: "Europe",
      releaseExplicitLock: false,
    });
  });

  it("releases an explicit lock once the camera exceeds the distance threshold", () => {
    const anchorLat = 35;
    const anchorLng = 105;
    const offset = EXPLICIT_REGION_RELEASE_DISTANCE_DEGREES + 1;

    expect(
      resolveRegionSettleDecision({
        latitudeDelta: 24,
        mapCenter: { latitude: anchorLat + offset, longitude: anchorLng },
        is3d: false,
        isMapAnimating: false,
        suppressWorldReset: false,
        explicitLock: { region: "Asia", anchor: [anchorLat, anchorLng] },
        currentFocusedRegion: "Asia",
        nearestRegion: "Europe",
        pendingCandidate: null,
      }),
    ).toMatchObject({
      kind: "explore_tier",
      releaseExplicitLock: true,
      scheduleRegionSwitch: "Europe",
    });
  });
});

describe("shouldCommitScheduledRegionSwitch", () => {
  it("aborts when the viewport returns to world zoom", () => {
    expect(
      shouldCommitScheduledRegionSwitch({
        latitudeDelta: 120,
        pendingCandidate: "Europe",
        expectedRegion: "Europe",
      }),
    ).toBe(false);
  });

  it("commits when the pending candidate still matches", () => {
    expect(
      shouldCommitScheduledRegionSwitch({
        latitudeDelta: 24,
        pendingCandidate: "Europe",
        expectedRegion: "Europe",
      }),
    ).toBe(true);
  });
});

describe("resolveExternalMapFocusEligibility", () => {
  it("defers until countries are fully loaded", () => {
    expect(
      resolveExternalMapFocusEligibility({
        intent,
        countriesFullyLoaded: false,
        countryFound: true,
        alreadyAppliedCountryName: null,
        useGlobeCamera: false,
        flatMapReady: true,
        globeReady: false,
      }),
    ).toEqual({ eligible: false, deferReason: "countries_loading" });
  });

  it("defers flat-map focus until MapView is ready", () => {
    expect(
      resolveExternalMapFocusEligibility({
        intent,
        countriesFullyLoaded: true,
        countryFound: true,
        alreadyAppliedCountryName: null,
        useGlobeCamera: false,
        flatMapReady: false,
        globeReady: false,
      }),
    ).toEqual({ eligible: false, deferReason: "flat_map_not_ready" });
  });

  it("applies when flat prerequisites are satisfied", () => {
    expect(
      resolveExternalMapFocusEligibility({
        intent,
        countriesFullyLoaded: true,
        countryFound: true,
        alreadyAppliedCountryName: null,
        useGlobeCamera: false,
        flatMapReady: true,
        globeReady: false,
      }),
    ).toEqual({ eligible: true });
  });

  it("ignores duplicate applications for the same country", () => {
    expect(
      resolveExternalMapFocusEligibility({
        intent,
        countriesFullyLoaded: true,
        countryFound: true,
        alreadyAppliedCountryName: "Japan",
        useGlobeCamera: false,
        flatMapReady: true,
        globeReady: false,
      }),
    ).toEqual({ eligible: false });
  });
});

describe("random FAB helpers", () => {
  it("rejects taps during animation or cooldown", () => {
    expect(
      shouldAcceptRandomFabTap({
        isMapAnimating: true,
        nowMs: 10_000,
        lastTapAtMs: 0,
      }),
    ).toBe(false);

    expect(
      shouldAcceptRandomFabTap({
        isMapAnimating: false,
        nowMs: 500,
        lastTapAtMs: 0,
        cooldownMs: RANDOM_FAB_TAP_COOLDOWN_MS,
      }),
    ).toBe(false);
  });

  it("accepts taps after the cooldown window", () => {
    expect(
      shouldAcceptRandomFabTap({
        isMapAnimating: false,
        nowMs: RANDOM_FAB_TAP_COOLDOWN_MS,
        lastTapAtMs: 0,
      }),
    ).toBe(true);
  });

  it("tracks stale async random pick generations", () => {
    expect(isRandomPickGenerationCurrent(2, 3)).toBe(false);
    expect(isRandomPickGenerationCurrent(3, 3)).toBe(true);
  });
});

describe("map mode transition helpers", () => {
  it("queues flat restore state when leaving 3D", () => {
    expect(
      resolveMapModeTogglePending({
        currentMode: "3d",
        activeCountryName: "Japan",
        focusTransitionCountryName: null,
        focusedRegion: "Asia",
        presentationMode: "preview",
      }),
    ).toEqual({
      pendingFlatFocusName: "Japan",
      pendingFlatPresentationMode: "preview",
      pendingGlobeFocusName: null,
      pendingGlobeRegionFocus: null,
    });
  });

  it("queues globe continent focus when entering 3D without a country", () => {
    expect(
      resolveMapModeTogglePending({
        currentMode: "2d",
        activeCountryName: null,
        focusTransitionCountryName: null,
        focusedRegion: "Europe",
        presentationMode: "idle",
      }),
    ).toEqual({
      pendingGlobeFocusName: null,
      pendingGlobeRegionFocus: "Europe",
      pendingFlatFocusName: null,
      pendingFlatPresentationMode: null,
    });
  });

  it("restores country framing after 3D to 2D when preview was open", () => {
    expect(
      resolveFlatTransitionRestore({
        pendingFocusName: "Japan",
        pendingPresentationMode: "preview",
        activeCountryName: "Japan",
      }),
    ).toEqual({
      focusName: "Japan",
      restorePreview: true,
      framing: "country",
    });
  });

  it("uses continent framing for passive 3D to 2D handoffs", () => {
    expect(
      resolveFlatTransitionRestore({
        pendingFocusName: "Japan",
        pendingPresentationMode: null,
        activeCountryName: null,
      }),
    ).toEqual({
      focusName: "Japan",
      restorePreview: false,
      framing: "continent",
    });
  });
});
