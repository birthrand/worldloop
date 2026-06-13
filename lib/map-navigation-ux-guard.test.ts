import { describe, expect, it } from "vitest";

import {
  MAP_NAVIGATION_TAP_COOLDOWN_MS,
  shouldAcceptNavigationTap,
  shouldIgnoreIdenticalRapidRepeat,
} from "@/lib/map-navigation-ux-guard";

describe("map-navigation-ux-guard", () => {
  it("throttles taps within the cooldown window", () => {
    const nowMs = 10_000;
    expect(
      shouldAcceptNavigationTap({
        nowMs,
        lastTapAtMs: nowMs - MAP_NAVIGATION_TAP_COOLDOWN_MS,
      }),
    ).toBe(true);
    expect(
      shouldAcceptNavigationTap({
        nowMs,
        lastTapAtMs: nowMs - MAP_NAVIGATION_TAP_COOLDOWN_MS + 1,
      }),
    ).toBe(false);
  });

  it("ignores identical rapid repeats only", () => {
    const nowMs = 5_000;
    const last = {
      countryName: "France",
      source: "mapTap",
      atMs: nowMs - 100,
    };

    expect(
      shouldIgnoreIdenticalRapidRepeat({
        last,
        next: { countryName: "France", source: "mapTap" },
        nowMs,
      }),
    ).toBe(true);

    expect(
      shouldIgnoreIdenticalRapidRepeat({
        last,
        next: { countryName: "Germany", source: "mapTap" },
        nowMs,
      }),
    ).toBe(false);
  });
});
