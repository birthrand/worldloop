import type { SelectionSource } from "@/store/use-identity-store";

import type { DiscoveryScope } from "@/types/geo";

export type MapPresentationMode = "idle" | "focus" | "preview";

export type MapPresentationIntent = {
  countryName: string;
  mode: Extract<MapPresentationMode, "focus" | "preview">;
  source: Exclude<SelectionSource, null>;
  /** Snapshot of spatial context when navigating Explore → Map. */
  discoveryScope?: DiscoveryScope;
  scopeMode?: DiscoveryScope["mode"];
};
