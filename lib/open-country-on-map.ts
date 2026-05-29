import { Image } from "expo-image";

import { buildFlagCdnUrl, resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl } from "@/lib/map-country";
import { syncMapRegionFocusForCountry } from "@/lib/map-region-focus";
import { useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { SelectionSource } from "@/store/use-identity-store";
import type { Country } from "@/types/country";

function prefetchCountryFlag(country: Country): void {
  const flagUri = resolveFlagCdnUrl(
    country.flag,
    cca2FromFlagUrl(country.flag),
  );
  if (flagUri) {
    void Image.prefetch(flagUri);
    return;
  }
  const iso2 = country.cca2?.trim();
  if (iso2?.length === 2) {
    void Image.prefetch(buildFlagCdnUrl(iso2));
  }
}

function prepareMapForCountry(
  country: Country,
  source: Exclude<SelectionSource, null> = "search",
): void {
  const mapUi = useMapUiStore.getState();
  const map = useMapStore.getState();

  prefetchCountryFlag(country);

  map.setMapMode("2d");
  mapUi.setCountryMarkerMode("flag");
  // Explore discovery starts at world zoom — region sync happens during the camera flight.
  if (source !== "explore") {
    syncMapRegionFocusForCountry(country);
  }
  useRecentlyViewedStore.getState().recordView(country);
}

/**
 * External entry → Map: fly to country and focus only (no preview).
 * Map screen completes the flow via `pendingMapIntent` (mode: focus).
 * Identity commits after the camera flight acknowledges (Phase 3).
 */
export function focusCountryOnMap(
  country: Country,
  source: Exclude<SelectionSource, null> = "search",
): void {
  prepareMapForCountry(country, source);
  const map = useMapStore.getState();
  map.focusCountryFromExternal(country.name, country, source);
}

/** @deprecated Use focusCountryOnMap — spotlight no longer opens preview. */
export function spotlightCountryOnMap(country: Country): void {
  focusCountryOnMap(country);
}

/** Close search and focus the country on the map (no forced preview). */
export function openCountryOnMap(country: Country): void {
  useSearchUiStore.getState().closeSearch();
  focusCountryOnMap(country);
}
