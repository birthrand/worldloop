import { create } from "zustand";

import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { fetchMapCountries } from "@/lib/api";
import { normalizeCountryRegion } from "@/lib/app-region";
import { getClientCache, staleWhileRevalidate } from "@/lib/client-cache";
import { countryToMapCountry, isValidLatLng } from "@/lib/map-country";
import { prefetchMapCountryDetails } from "@/lib/prefetch-country-details";
import {
  useIdentityStore,
  type SelectionSource,
} from "@/store/use-identity-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";
import type { Country, MapCountry } from "@/types/country";
import type { DiscoveryScope } from "@/types/geo";
import type { MapPresentationIntent } from "@/types/map-presentation";

export type MapFilterChip =
  | "all"
  | "population"
  | "culture"
  | "nature"
  | "history";

export type MapMode = "2d" | "3d";

type MapStatus = "idle" | "loading" | "error";

export type GlobeCameraHandle = {
  focusCountry: (country: MapCountry, duration?: number) => void;
  focusLatLng: (
    lat: number,
    lng: number,
    duration?: number,
    targetDistance?: number,
  ) => void;
  resetCamera: () => void;
  zoomBy: (direction: "in" | "out") => void;
};

type MapState = {
  countries: MapCountry[];
  status: MapStatus;
  error: string | null;
  /** True after a successful full fetch from GET /map/countries (not a single injected country). */
  mapCountriesFullyLoaded: boolean;
  /** Set when opening Map from Explore/search; consumed once the map can fly the camera. */
  pendingMapIntent: MapPresentationIntent | null;
  activeChip: MapFilterChip;
  mapMode: MapMode;
  globeCamera: GlobeCameraHandle | null;
  loadMapCountries: (options?: { force?: boolean }) => Promise<void>;
  focusCountryFromExternal: (
    name: string,
    fallback?: Country,
    source?: Exclude<SelectionSource, null>,
    scopeSnapshot?: DiscoveryScope,
  ) => void;
  clearPendingMapIntent: () => void;
  selectRandomCountry: () => MapCountry | null;
  setActiveChip: (chip: MapFilterChip) => void;
  setMapMode: (mode: MapMode) => void;
  toggleMapMode: () => void;
  registerGlobeCamera: (handle: GlobeCameraHandle | null) => void;
  focusCountryOnGlobe: (name: string, duration?: number) => void;
  focusLatLngOnGlobe: (
    lat: number,
    lng: number,
    duration?: number,
    targetDistance?: number,
  ) => void;
  getVisibleCountries: () => MapCountry[];
};

let mapCountriesLoadPromise: Promise<void> | null = null;

function resolveMapCountry(
  countries: MapCountry[],
  name: string,
): MapCountry | null {
  return countries.find((c) => c.name === name) ?? null;
}

function withValidCoordinates(countries: MapCountry[]): MapCountry[] {
  return countries
    .filter((c) => isValidLatLng(c.latlng))
    .map((c) => normalizeCountryRegion(c));
}

/** Population chip: top 20% by population. Other chips are visual-only in v1. */
export function filterMapCountriesByChip(
  countries: MapCountry[],
  chip: MapFilterChip,
): MapCountry[] {
  if (chip !== "population") return countries;

  const sorted = [...countries].sort((a, b) => b.population - a.population);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.2));
  const topNames = new Set(sorted.slice(0, topCount).map((c) => c.name));
  return countries.filter((c) => topNames.has(c.name));
}

export const useMapStore = create<MapState>()((set, get) => ({
  countries: [],
  status: "idle",
  error: null,
  mapCountriesFullyLoaded: false,
  pendingMapIntent: null,
  activeChip: "all",
  mapMode: "2d",
  globeCamera: null,

  loadMapCountries: async (options) => {
    const force = options?.force ?? false;

    if (!force && get().mapCountriesFullyLoaded) {
      return;
    }
    if (mapCountriesLoadPromise) {
      return mapCountriesLoadPromise;
    }

    mapCountriesLoadPromise = (async () => {
      const cacheKey = CLIENT_CACHE_KEYS.mapCountries;
      const diskCache = await getClientCache<MapCountry[]>(cacheKey);
      const diskCachedCountries =
        diskCache.data && diskCache.data.length > 0
          ? withValidCoordinates(diskCache.data)
          : [];
      const hasValidDiskCache = diskCachedCountries.length > 0;

      if (hasValidDiskCache) {
        set({
          countries: diskCachedCountries,
          status: "idle",
          error: null,
          mapCountriesFullyLoaded: true,
        });
      } else {
        set({ status: "loading", error: null });
      }

      try {
        await staleWhileRevalidate({
          key: cacheKey,
          ttlSeconds: CLIENT_CACHE_TTL.mapCountries,
          force: force || !hasValidDiskCache,
          fetcher: () => fetchMapCountries().then((response) => response.data),
          onCached: (data) => {
            if (!hasValidDiskCache) {
              const cachedCountries =
                data.length > 0 ? withValidCoordinates(data) : [];
              if (cachedCountries.length > 0) {
                set({
                  countries: cachedCountries,
                  status: "idle",
                  error: null,
                  mapCountriesFullyLoaded: true,
                });
              }
            }
          },
          onFetched: (data) => {
            const countries = withValidCoordinates(data);
            set({
              countries,
              status: "idle",
              error: null,
              ...(countries.length > 0
                ? { mapCountriesFullyLoaded: true }
                : {}),
            });
          },
        });
      } catch (err) {
        if (get().countries.length === 0) {
          const message =
            err instanceof Error ? err.message : "Failed to load map countries";
          set({ status: "error", error: message });
        }
      }

      const countries = get().countries;
      if (countries.length > 0) {
        void prefetchMapCountryDetails(countries);
      }
    })().finally(() => {
      mapCountriesLoadPromise = null;
    });

    return mapCountriesLoadPromise;
  },

  focusCountryFromExternal: (
    name,
    fallback,
    source = "search",
    scopeSnapshot,
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    let country = resolveMapCountry(get().countries, trimmed);
    let countries = get().countries;

    if (!country && fallback) {
      const injected = countryToMapCountry(fallback);
      country = injected;
      if (!countries.some((c) => c.name === injected.name)) {
        countries = [...countries, injected];
      }
    }

    const discoveryScope =
      scopeSnapshot ?? useSpatialContextStore.getState().discoveryScope;

    set({
      countries,
      pendingMapIntent: {
        countryName: trimmed,
        mode: "focus",
        source,
        discoveryScope,
        scopeMode: discoveryScope.mode,
      },
    });
  },

  clearPendingMapIntent: () => set({ pendingMapIntent: null }),

  selectRandomCountry: () => {
    const visible = get().getVisibleCountries();
    if (visible.length === 0) return null;

    const pick = visible[Math.floor(Math.random() * visible.length)] ?? null;
    if (pick) {
      set({
        pendingMapIntent: {
          countryName: pick.name,
          mode: "focus",
          source: "shuffle",
        },
      });
    }
    return pick;
  },

  setActiveChip: (chip) => set({ activeChip: chip }),

  setMapMode: (mode) => set({ mapMode: mode }),

  toggleMapMode: () =>
    set((state) => ({
      mapMode: state.mapMode === "3d" ? "2d" : "3d",
    })),

  registerGlobeCamera: (handle) => {
    set({ globeCamera: handle });
  },

  focusCountryOnGlobe: (name, duration) => {
    const country =
      resolveMapCountry(get().countries, name) ??
      (useIdentityStore.getState().activeCountry?.name === name
        ? useIdentityStore.getState().activeCountry
        : null);
    if (!country) return;
    get().globeCamera?.focusCountry(country, duration);
  },

  focusLatLngOnGlobe: (lat, lng, duration, targetDistance) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    get().globeCamera?.focusLatLng(lat, lng, duration, targetDistance);
  },

  getVisibleCountries: () => {
    const { countries, activeChip } = get();
    return filterMapCountriesByChip(countries, activeChip);
  },
}));
