import type { MapMode } from "@/store/use-map-store";
import type { MapPresentationMode } from "@/types/map-presentation";

export type MapModeTogglePending = {
  pendingGlobeFocusName: string | null;
  pendingGlobeRegionFocus: string | null;
  pendingFlatFocusName: string | null;
  pendingFlatPresentationMode: MapPresentationMode | null;
};

/** Pending focus refs to apply after a 2D ↔ 3D crossfade completes. */
export function resolveMapModeTogglePending(input: {
  currentMode: MapMode;
  activeCountryName: string | null;
  focusTransitionCountryName: string | null;
  presentationMode: MapPresentationMode;
}): MapModeTogglePending {
  if (input.currentMode === "3d") {
    const focusName =
      input.activeCountryName ?? input.focusTransitionCountryName ?? null;
    return {
      pendingFlatFocusName: focusName,
      pendingFlatPresentationMode: input.presentationMode,
      pendingGlobeFocusName: null,
      pendingGlobeRegionFocus: null,
    };
  }

  const countryFocus =
    input.activeCountryName ?? input.focusTransitionCountryName ?? null;

  return {
    pendingGlobeFocusName: countryFocus,
    pendingGlobeRegionFocus: null,
    pendingFlatFocusName: null,
    pendingFlatPresentationMode: null,
  };
}

export type FlatTransitionRestore = {
  focusName: string | null;
  restorePreview: boolean;
  framing: "continent" | "country";
};

/** How to restore camera framing after 3D → 2D crossfade. */
export function resolveFlatTransitionRestore(input: {
  pendingFocusName: string | null;
  pendingPresentationMode: MapPresentationMode | null;
  activeCountryName: string | null;
}): FlatTransitionRestore | null {
  if (!input.pendingFocusName) {
    return null;
  }

  const wasActive = input.activeCountryName === input.pendingFocusName;
  const restorePreview = input.pendingPresentationMode === "preview";

  return {
    focusName: input.pendingFocusName,
    restorePreview,
    framing: wasActive || restorePreview ? "country" : "continent",
  };
}
