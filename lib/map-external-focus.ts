import type { MapPresentationIntent } from "@/types/map-presentation";

export type ExternalMapFocusIntent = MapPresentationIntent;

export type ExternalMapFocusDeferReason =
  | "countries_loading"
  | "country_not_in_list"
  | "flat_map_not_ready"
  | "globe_not_ready";

export type ExternalMapFocusEligibility = {
  eligible: boolean;
  deferReason?: ExternalMapFocusDeferReason;
};

/**
 * Readiness gate for cross-screen handoffs (Explore → Map, etc.).
 *
 * Intent acceptance happens in the store — this only defers execution until
 * the map can actually fly the camera. Never dedupe by country or intent id.
 */
export function resolveExternalMapFocusEligibility(input: {
  intent: ExternalMapFocusIntent | null;
  countriesFullyLoaded: boolean;
  countryFound: boolean;
  useGlobeCamera: boolean;
  flatMapReady: boolean;
  globeReady: boolean;
}): ExternalMapFocusEligibility {
  if (!input.intent) {
    return { eligible: false };
  }

  if (!input.countryFound) {
    if (!input.countriesFullyLoaded) {
      return { eligible: false, deferReason: "countries_loading" };
    }
    return { eligible: false, deferReason: "country_not_in_list" };
  }

  if (!input.useGlobeCamera && !input.flatMapReady) {
    return { eligible: false, deferReason: "flat_map_not_ready" };
  }

  if (input.useGlobeCamera && !input.globeReady) {
    return { eligible: false, deferReason: "globe_not_ready" };
  }

  return { eligible: true };
}
