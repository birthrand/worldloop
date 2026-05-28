import { Image } from "expo-image";

import { buildFlagCdnUrl, resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl } from "@/lib/map-country";
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

/**
 * Explore action rail → Map: single spotlight pin, preview opens on pin tap only.
 */
export function spotlightCountryOnMap(country: Country): void {
  const mapUi = useMapUiStore.getState();
  const map = useMapStore.getState();

  prefetchCountryFlag(country);

  // Normalize map presentation for cross-screen deep links:
  // 2D view + flag pins guarantees the selected country marker is visible.
  map.setMapMode("2d");
  mapUi.setCountryMarkerMode("flag");
  mapUi.setSpotlightCountry(country.name);
  map.focusCountryFromExternal(country.name, country, "spotlight");
  useRecentlyViewedStore.getState().recordView(country);
}

/**
 * Search → Map: zoom to region and show all regional pins (preview may open).
 */
export function focusCountryOnMap(country: Country): void {
  const mapUi = useMapUiStore.getState();
  const map = useMapStore.getState();

  prefetchCountryFlag(country);

  // Keep behavior consistent regardless of source screen.
  map.setMapMode("2d");
  mapUi.setCountryMarkerMode("flag");
  mapUi.setSpotlightCountry(null);
  map.focusCountryFromExternal(country.name, country, "region");
  useRecentlyViewedStore.getState().recordView(country);
}

/** Close search and focus the country on the map (stays on Map tab). */
export function openCountryOnMap(country: Country): void {
  useSearchUiStore.getState().closeSearch();
  focusCountryOnMap(country);
}
