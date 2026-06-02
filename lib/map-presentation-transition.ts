import { selectCountryOnMap } from "@/lib/map-country-selection";
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
}: {
  country: MapCountry;
  mode: CountryPresentationMode;
  source: Exclude<SelectionSource, null>;
}): void {
  useMapPresentationStore.getState().setMode(mode);
  selectCountryOnMap(country, source);
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
}: {
  country: MapCountry;
  mode: CountryPresentationMode;
  source: Exclude<SelectionSource, null>;
}): void {
  commitMapPresentation({ country, mode, source });
}

export function dismissMapPreview(): void {
  useMapPresentationStore.getState().setMode("focus");
}

export function resetMapPresentation(): void {
  useMapPresentationStore.getState().resetPresentation();
}
