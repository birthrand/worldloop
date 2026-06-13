import type { SelectionSource } from "@/store/use-identity-store";
import type { DiscoveryScope } from "@/types/geo";
import type { MapPresentationIntent } from "@/types/map-presentation";

/**
 * Layer 1 — Intent (truth)
 *
 * Every navigation request is recorded with a unique intentId.
 * Never dedupe by country name, feed state, or "already focused" rules here.
 */

let mapNavigationIntentCounter = 0;

export function nextMapNavigationIntentId(): number {
  mapNavigationIntentCounter += 1;
  return mapNavigationIntentCounter;
}

export function createMapPresentationIntent(input: {
  countryName: string;
  mode: MapPresentationIntent["mode"];
  source: Exclude<SelectionSource, null>;
  discoveryScope?: DiscoveryScope;
  scopeMode?: DiscoveryScope["mode"];
}): MapPresentationIntent {
  return {
    intentId: nextMapNavigationIntentId(),
    ...input,
  };
}
