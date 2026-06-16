import { Image } from "expo-image";

import { buildFlagCdnUrl, resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl } from "@/lib/map-country";
import { syncMapRegionFocusForCountry } from "@/lib/map-region-focus";
import {
  useIdentityStore,
  type SelectionSource,
} from "@/store/use-identity-store";
import { useMapLandmarkFocusStore } from "@/store/use-map-landmark-focus-store";
import { useMapStore } from "@/store/use-map-store";
import { useMapUiStore } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";
import type { Country } from "@/types/country";
import type { DiscoveryScope } from "@/types/geo";
import type { MapLandmarkFocus } from "@/types/map-presentation";

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
  scopeSnapshot?: DiscoveryScope,
  landmarkFocus?: MapLandmarkFocus,
): void {
  const mapUi = useMapUiStore.getState();
  const scope =
    scopeSnapshot ?? useSpatialContextStore.getState().discoveryScope;

  prefetchCountryFlag(country);

  mapUi.setCountryMarkerMode(landmarkFocus ? "hidden" : "flag");

  if (source === "explore") {
    mapUi.setDisplayMode(scope.focusedRegion ? "explore" : "globalPulse");
    // Region chrome is applied on the map screen after the camera flight.
  } else if (source === "countryDetail") {
    if (scope.focusedRegion) {
      mapUi.setFocusedRegion(scope.focusedRegion);
      mapUi.setDisplayMode("explore");
      syncMapRegionFocusForCountry(country, { explicitFocus: true });
    } else {
      mapUi.setFocusedRegion(null);
      mapUi.setDisplayMode("globalPulse");
    }
  } else {
    syncMapRegionFocusForCountry(country, { explicitFocus: true });
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
  options?: { landmarkFocus?: MapLandmarkFocus },
): void {
  const identity = useIdentityStore.getState();

  if (source === "countryDetail") {
    identity.setCountryDetailReturnName(country.name);
    const search = useSearchUiStore.getState();
    search.clearResumeSearchOnReturn();
    if (search.isOpen) {
      search.closeSearch();
    }
  } else {
    identity.setCountryDetailReturnName(null);
  }

  const scopeSnapshot = useSpatialContextStore.getState().discoveryScope;

  if (options?.landmarkFocus) {
    useMapLandmarkFocusStore
      .getState()
      .setActiveLandmark(options.landmarkFocus);
  } else {
    useMapLandmarkFocusStore.getState().clearActiveLandmark();
  }

  prepareMapForCountry(country, source, scopeSnapshot, options?.landmarkFocus);

  if (source === "explore") {
    identity.setExploreMapSessionActive(true);
    identity.setTravelMapSessionActive(false);
  } else if (source === "travelMap") {
    identity.setTravelMapSessionActive(true);
    identity.setExploreMapSessionActive(false);
  } else if (source === "countryDetail") {
    identity.setExploreMapSessionActive(false);
    // Preserve travel map when detouring country detail → map → country detail.
    if (!identity.travelMapSessionActive) {
      identity.setTravelMapSessionActive(false);
    }
  } else {
    identity.setExploreMapSessionActive(false);
    identity.setTravelMapSessionActive(false);
  }

  const map = useMapStore.getState();
  map.focusCountryFromExternal(
    country.name,
    country,
    source,
    scopeSnapshot,
    options?.landmarkFocus,
  );
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
