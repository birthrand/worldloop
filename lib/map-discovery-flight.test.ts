import { describe, expect, it } from "vitest";

import { WORLD_INITIAL_REGION } from "@/constants/map-regions";
import { buildDiscoveryPhases } from "@/lib/map-discovery-flight";
import type { MapCountry } from "@/types/country";

const japan: MapCountry = {
  name: "Japan",
  population: 125_000_000,
  region: "Asia",
  capital: "Tokyo",
  flag: "https://flagcdn.com/w320/jp.png",
  image: null,
  latlng: [36, 138],
};

describe("buildDiscoveryPhases", () => {
  it.each(["explore", "fab"] as const)(
    "uses a single world-view pan for %s",
    (source) => {
      const phases = buildDiscoveryPhases({
        pick: japan,
        cluster: null,
        source,
        includeWorld: false,
      });

      expect(phases).toHaveLength(1);
      expect(phases[0]?.duration).toBe(900);
      expect(phases[0]?.region).toMatchObject({
        latitude: 36,
        longitude: 138,
        latitudeDelta: WORLD_INITIAL_REGION.latitudeDelta,
        longitudeDelta: WORLD_INITIAL_REGION.longitudeDelta,
      });
    },
  );

  it("runs continent-only for search focus; adds country phase for preview", () => {
    const focusPhases = buildDiscoveryPhases({
      pick: japan,
      cluster: null,
      source: "search",
      includeWorld: false,
      mode: "focus",
    });
    expect(focusPhases).toHaveLength(1);
    expect(focusPhases[0]?.region.latitudeDelta).toBeGreaterThan(28);

    const previewPhases = buildDiscoveryPhases({
      pick: japan,
      cluster: null,
      source: "search",
      includeWorld: false,
      mode: "preview",
    });
    expect(previewPhases).toHaveLength(2);
    expect(previewPhases[1]?.region.latitudeDelta).toBeLessThan(28);
  });

  it("keeps continent framing for focus map taps on 2D", () => {
    const phases = buildDiscoveryPhases({
      pick: japan,
      cluster: null,
      source: "mapTap",
      includeWorld: false,
      mode: "focus",
    });

    expect(phases).toHaveLength(1);
    expect(phases[0]?.region.latitudeDelta).toBeGreaterThan(28);
  });

  it("zooms to country detail for preview shuffle on 2D", () => {
    const phases = buildDiscoveryPhases({
      pick: japan,
      cluster: null,
      source: "shuffle",
      includeWorld: false,
      mode: "preview",
    });

    expect(phases).toHaveLength(1);
    expect(phases[0]?.region.latitudeDelta).toBeLessThan(28);
  });
});
