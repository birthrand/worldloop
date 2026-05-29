import { syncMapRegionFocusForCountry } from "@/lib/map-region-focus";
import { selectCountryOnMap } from "@/lib/map-country-selection";
import { useMapPresentationStore } from "@/store/use-map-presentation-store";
import type { SelectionSource } from "@/store/use-identity-store";
import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

type CountryPresentationMode = Extract<MapPresentationMode, "focus" | "preview">;

/** Region + UI prep before camera flight — identity commits later via `commitMapPresentation`. */
export function stageMapPresentationForFlight(country: MapCountry): void {
  syncMapRegionFocusForCountry(country);
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
  syncMapRegionFocusForCountry(country);
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
