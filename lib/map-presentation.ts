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

/** Boundary taps may switch countries only during an Explore → Map handoff. */
export function canSelectCountryOnMapBoundary(
  activeCountry: MapCountry | null,
  candidateName: string,
  selectionSource: SelectionSource,
  exploreMapSessionActive = false,
): boolean {
  if (!activeCountry) {
    return true;
  }
  if (isExploreMapHandoff(selectionSource, null, exploreMapSessionActive)) {
    return true;
  }
  return activeCountry.name === candidateName;
}

/** True while the map was opened from Explore (including before identity commits). */
export function isExploreMapHandoff(
  selectionSource: SelectionSource,
  pendingSource?: SelectionSource | null,
  exploreMapSessionActive = false,
): boolean {
  if (selectionSource === "countryDetail") {
    return false;
  }

  return (
    exploreMapSessionActive ||
    selectionSource === "explore" ||
    pendingSource === "explore"
  );
}

/** 2D flat map — only the selected country flag (explore preview or country-detail map). */
export function isFlatSingleCountryFlagMode(
  is3d: boolean,
  selectionSource: SelectionSource,
  exploreMapHandoffActive: boolean,
  activeCountry: MapCountry | null,
): boolean {
  if (is3d || !activeCountry) {
    return false;
  }

  return exploreMapHandoffActive || selectionSource === "countryDetail";
}

export function resolveExploreMapHandoffMarkerName(
  activeCountryName: string | null,
  focusTransitionCountryName: string | null,
  pendingCountryName?: string | null,
): string | null {
  const pending = pendingCountryName?.trim();
  return activeCountryName ?? focusTransitionCountryName ?? pending ?? null;
}
