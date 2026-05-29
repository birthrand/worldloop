import { create } from "zustand";

import { fetchMapCountries } from "@/lib/api";
import { countryToMapCountry, isValidLatLng } from "@/lib/map-country";
import { selectCountryOnMap } from "@/lib/map-country-selection";
import { useIdentityStore } from "@/store/use-identity-store";
import type { Country, MapCountry } from "@/types/country";

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
  /** Set when opening Map from Explore/search; consumed once the map can fly the camera. */
  pendingExternalFocusName: string | null;
  activeChip: MapFilterChip;
  mapMode: MapMode;
  globeCamera: GlobeCameraHandle | null;
  loadMapCountries: () => Promise<void>;
  focusCountryFromExternal: (name: string, fallback?: Country) => void;
  clearPendingExternalFocus: () => void;
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
  return countries.filter((c) => isValidLatLng(c.latlng));
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

export const useMapStore = create<MapState>((set, get) => ({
  countries: [],
  status: "idle",
  error: null,
  pendingExternalFocusName: null,
  activeChip: "all",
  mapMode: "2d",
  globeCamera: null,

  loadMapCountries: async () => {
    const { status, countries } = get();
    if (countries.length > 0 && status !== "loading") {
      return;
    }
    if (mapCountriesLoadPromise) {
      return mapCountriesLoadPromise;
    }

    mapCountriesLoadPromise = (async () => {
      set({ status: "loading", error: null });

      try {
        const { data } = await fetchMapCountries();
        const nextCountries = withValidCoordinates(data);
        set({
          countries: nextCountries,
          status: "idle",
          error: null,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load map countries";
        set({ status: "error", error: message });
      } finally {
        mapCountriesLoadPromise = null;
      }
    })();

    return mapCountriesLoadPromise;
  },

  focusCountryFromExternal: (name, fallback) => {
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

    set({
      countries,
      pendingExternalFocusName: trimmed,
    });

    if (country) {
      selectCountryOnMap(country, "search");
    }
  },

  clearPendingExternalFocus: () => set({ pendingExternalFocusName: null }),

  selectRandomCountry: () => {
    const visible = get().getVisibleCountries();
    if (visible.length === 0) return null;

    const pick = visible[Math.floor(Math.random() * visible.length)] ?? null;
    if (pick) {
      selectCountryOnMap(pick, "shuffle");
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
    if (!handle) return;

    const { pendingExternalFocusName, countries, mapMode } = get();
    if (!pendingExternalFocusName || mapMode !== "3d") return;

    const country =
      resolveMapCountry(countries, pendingExternalFocusName) ??
      useIdentityStore.getState().activeCountry;
    if (!country) return;

    handle.focusCountry(country, 650);
    get().clearPendingExternalFocus();
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
    get().globeCamera?.focusLatLng(lat, lng, duration, targetDistance);
  },

  getVisibleCountries: () => {
    const { countries, activeChip } = get();
    return filterMapCountriesByChip(countries, activeChip);
  },
}));
