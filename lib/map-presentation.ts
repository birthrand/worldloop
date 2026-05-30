import type { MapCountry } from "@/types/country";
import type { MapPresentationMode } from "@/types/map-presentation";

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
