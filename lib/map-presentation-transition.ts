import { selectCountryOnMap } from "@/lib/map-country-selection";
import type {
  MapInteractionLogContext,
  MapInteractionTrigger,
} from "@/lib/map-debug";
import {
  isExplicitCountryFocusSource,
  shouldSyncFocusedRegionForSelectionSource,
  syncMapRegionFocusForCountry,
} from "@/lib/map-region-focus";
import type { SelectionSource } from "@/store/use-identity-store";
import { useMapPresentationStore } from "@/store/use-map-presentation-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

export type MapPresentationDebugContext = MapInteractionLogContext & {
  trigger?: MapInteractionTrigger;
  focusedContinent?: string | null;
  continentOverlay?: string | null;
  presentationMode?: string;
  isPreviewOpen?: boolean;
};

type CountryPresentationMode = Extract<
  MapPresentationMode,
  "focus" | "preview"
>;

/** Region + UI prep before camera flight — identity commits later via `commitMapPresentation`. */
export function stageMapPresentationForFlight(
  country: MapCountry,
  source: Exclude<SelectionSource, null>,
): void {
  const focusedRegion = useMapUiStore.getState().focusedRegion;
  if (
    shouldSyncFocusedRegionForSelectionSource(country, focusedRegion, source)
  ) {
    syncMapRegionFocusForCountry(country, {
      explicitFocus: isExplicitCountryFocusSource(source),
    });
  }
}

/** After camera acknowledges the flight — commit identity and presentation mode. */
export function commitMapPresentation({
  country,
  mode,
  source,
  debug,
}: {
  country: MapCountry;
  mode: CountryPresentationMode;
  source: Exclude<SelectionSource, null>;
  debug?: MapPresentationDebugContext;
}): void {
  useMapPresentationStore.getState().setMode(mode);
  selectCountryOnMap(country, source, debug);
  const focusedRegion = useMapUiStore.getState().focusedRegion;
  if (
    shouldSyncFocusedRegionForSelectionSource(country, focusedRegion, source)
  ) {
    syncMapRegionFocusForCountry(country, {
      explicitFocus: isExplicitCountryFocusSource(source),
    });
  }
}

/** Immediate transition (no camera deferral) — e.g. preview on already-focused country. */
export function transitionMapPresentation({
  country,
  mode,
  source,
  debug,
}: {
  country: MapCountry;
  mode: CountryPresentationMode;
  source: Exclude<SelectionSource, null>;
  debug?: MapPresentationDebugContext;
}): void {
  commitMapPresentation({ country, mode, source, debug });
}

export function dismissMapPreview(): void {
  useMapPresentationStore.getState().setMode("focus");
}

export function resetMapPresentation(): void {
  useMapPresentationStore.getState().resetPresentation();
}
