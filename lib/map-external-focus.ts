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

/** Pure gate for cross-screen map focus handoffs (Explore → Map, etc.). */
export function resolveExternalMapFocusEligibility(input: {
  intent: ExternalMapFocusIntent | null;
  countriesFullyLoaded: boolean;
  countryFound: boolean;
  alreadyAppliedCountryName: string | null;
  useGlobeCamera: boolean;
  flatMapReady: boolean;
  globeReady: boolean;
}): ExternalMapFocusEligibility {
  if (!input.intent) {
    return { eligible: false };
  }

  if (input.alreadyAppliedCountryName === input.intent.countryName) {
    return { eligible: false };
  }

  if (!input.countriesFullyLoaded) {
    return { eligible: false, deferReason: "countries_loading" };
  }

  if (!input.countryFound) {
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
