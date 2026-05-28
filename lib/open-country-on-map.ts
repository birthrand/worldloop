import { useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { Country } from "@/types/country";

/**
 * Explore action rail → Map: single spotlight pin, preview opens on pin tap only.
 */
export function spotlightCountryOnMap(country: Country): void {
  useMapUiStore.getState().setSpotlightCountry(country.name);
  useMapStore
    .getState()
    .focusCountryFromExternal(country.name, country, "spotlight");
  useRecentlyViewedStore.getState().recordView(country);
}

/**
 * Search → Map: zoom to region and show all regional pins (preview may open).
 */
export function focusCountryOnMap(country: Country): void {
  useMapUiStore.getState().setSpotlightCountry(null);
  useMapStore
    .getState()
    .focusCountryFromExternal(country.name, country, "region");
  useRecentlyViewedStore.getState().recordView(country);
}

/** Close search and focus the country on the map (stays on Map tab). */
export function openCountryOnMap(country: Country): void {
  useSearchUiStore.getState().closeSearch();
  focusCountryOnMap(country);
}
