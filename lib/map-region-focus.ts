import { normalizeAppRegion, normalizeCountryRegion } from "@/lib/app-region";
import type { SelectionSource } from "@/store/use-identity-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

export type SyncRegionFocusOptions = {
  /**
   * User explicitly navigated to this country as the focus target (search,
   * explore handoff, shuffle, etc.). When false, an active `focusedRegion` in
   * another continent is preserved.
   */
  explicitFocus?: boolean;
};

/**
 * Rule 1 — selection defines geography (`country.region` is always truth).
 * Rule 2 — `focusedRegion` is UI exploration intent (explicit nav only).
 * Rule 3 — geography does not overwrite intent unless allowed here.
 */
export function shouldSyncFocusedRegionForCountry(
  country: Pick<MapCountry, "region">,
  focusedRegion: string | null,
  options?: SyncRegionFocusOptions,
): boolean {
  const countryRegion = normalizeAppRegion(country.region);

  if (!focusedRegion) {
    return true;
  }

  if (focusedRegion === countryRegion) {
    return true;
  }

  return options?.explicitFocus === true;
}

/** Sources that always retarget continent focus when selecting a country. */
export function isExplicitCountryFocusSource(
  source: Exclude<SelectionSource, null>,
): boolean {
  return (
    source === "search" ||
    source === "explore" ||
    source === "countryDetail" ||
    source === "shuffle"
  );
}

export function shouldSyncFocusedRegionForSelectionSource(
  country: Pick<MapCountry, "region">,
  focusedRegion: string | null,
  source: Exclude<SelectionSource, null>,
): boolean {
  if (source === "fab") {
    return false;
  }

  const countryRegion = normalizeAppRegion(country.region);
  const crossContinentMapTap =
    source === "mapTap" && !!focusedRegion && focusedRegion !== countryRegion;

  return shouldSyncFocusedRegionForCountry(country, focusedRegion, {
    explicitFocus: crossContinentMapTap || isExplicitCountryFocusSource(source),
  });
}

/**
 * Align continent focus with a country when rules allow.
 * Returns whether `focusedRegion` was updated.
 */
export function syncMapRegionFocusForCountry(
  country: Pick<MapCountry, "name" | "region">,
  options?: SyncRegionFocusOptions,
): boolean {
  const focusedRegion = useMapUiStore.getState().focusedRegion;
  if (!shouldSyncFocusedRegionForCountry(country, focusedRegion, options)) {
    return false;
  }

  useMapUiStore
    .getState()
    .setFocusedRegion(normalizeCountryRegion(country).region);
  return true;
}
