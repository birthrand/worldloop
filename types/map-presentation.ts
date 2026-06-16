import type { SelectionSource } from "@/store/use-identity-store";

import type { DiscoveryScope } from "@/types/geo";

export type MapPresentationMode = "idle" | "focus" | "preview";

/** Landmark pin shown on the map (country-detail handoff from a landmark modal). */
export type MapLandmarkFocus = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type MapPresentationIntent = {
  /** Monotonic id — each navigation request is unique even for the same country. */
  intentId: number;
  countryName: string;
  mode: Extract<MapPresentationMode, "focus" | "preview">;
  source: Exclude<SelectionSource, null>;
  /** Snapshot of spatial context when navigating Explore → Map. */
  discoveryScope?: DiscoveryScope;
  scopeMode?: DiscoveryScope["mode"];
  landmarkFocus?: MapLandmarkFocus;
};
