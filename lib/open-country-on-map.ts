import { Image } from "expo-image";

import { buildFlagCdnUrl, resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl } from "@/lib/map-country";
import { syncMapRegionFocusForCountry } from "@/lib/map-region-focus";
import { useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
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

function prepareMapForCountry(country: Country): void {
  const mapUi = useMapUiStore.getState();
  const map = useMapStore.getState();

  prefetchCountryFlag(country);

  map.setMapMode("2d");
  mapUi.setCountryMarkerMode("flag");
  syncMapRegionFocusForCountry(country);
  useRecentlyViewedStore.getState().recordView(country);
}

/**
 * External entry → Map: fly to country and focus only (no preview).
 * Map screen completes the flow via `pendingExternalFocusName`.
 */
export function focusCountryOnMap(country: Country): void {
  prepareMapForCountry(country);
  const map = useMapStore.getState();
  map.focusCountryFromExternal(country.name, country);
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
