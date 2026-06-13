import type { SelectionSource } from "@/store/use-identity-store";
import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

/** Cross-screen map entry — user intent always overrides a locked selection. */
const PROGRAMMATIC_MAP_ENTRY_SOURCES = new Set<Exclude<SelectionSource, null>>([
  "countryDetail",
  "search",
  "explore",
  "fab",
  "shuffle",
]);

export function isProgrammaticMapEntrySource(
  source: Exclude<SelectionSource, null>,
): boolean {
  return PROGRAMMATIC_MAP_ENTRY_SOURCES.has(source);
}

export function isCountryPreviewOpen(
  mode: MapPresentationMode,
  activeCountry: MapCountry | null,
): boolean {
  return mode === "preview" && activeCountry !== null;
}

export function isCountryFocused(
  mode: MapPresentationMode,
  activeCountry: MapCountry | null,
): boolean {
  return mode === "focus" && activeCountry !== null;
}

export function showRegionChrome(
  focusedRegion: string | null,
  mode: MapPresentationMode,
  activeCountry: MapCountry | null,
): boolean {
  return !!focusedRegion && !activeCountry && mode !== "preview";
}

/** Presentation chrome — country focus pill (not preview). */
export function showCountryFocusPill(
  mode: MapPresentationMode,
  activeCountry: MapCountry | null,
): boolean {
  return !!activeCountry && mode !== "preview";
}

/** While a country is selected, map gestures must not clear or replace that selection. */
export function isCountrySelectionLocked(
  activeCountry: MapCountry | null,
): boolean {
  return activeCountry !== null;
}

/** Whether the map may commit a different country while selection is locked (map-tap UX guard). */
export function canSelectCountryOnMap(
  activeCountry: MapCountry | null,
  candidateName: string,
): boolean {
  if (!activeCountry) {
    return true;
  }
  return activeCountry.name === candidateName;
}
