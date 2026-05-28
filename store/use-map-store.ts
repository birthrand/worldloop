import { create } from "zustand";

import { fetchMapCountries } from "@/lib/api";
import {
  countryToMapCountry,
  isValidLatLng,
} from "@/lib/map-country";
import type { Country, MapCountry } from "@/types/country";

export type MapFilterChip =
  | "all"
  | "population"
  | "culture"
  | "nature"
  | "history";

export type MapMode = "2d" | "3d";

/** How the map should focus a country opened from Explore, search, etc. */
export type ExternalMapFocusMode = "spotlight" | "region";

type MapStatus = "idle" | "loading" | "error";

export type GlobeCameraHandle = {
  focusCountry: (country: MapCountry, duration?: number) => void;
  focusLatLng: (lat: number, lng: number, duration?: number) => void;
  resetCamera: () => void;
  zoomBy: (direction: "in" | "out") => void;
};

type MapState = {
  countries: MapCountry[];
  status: MapStatus;
  error: string | null;
  selectedCountry: MapCountry | null;
  /** Set when opening Map from Explore/search; consumed once the map can fly the camera. */
  pendingExternalFocusName: string | null;
  pendingExternalFocusMode: ExternalMapFocusMode | null;
  activeChip: MapFilterChip;
  mapMode: MapMode;
  globeCamera: GlobeCameraHandle | null;
  loadMapCountries: () => Promise<void>;
  selectCountry: (name: string | null) => void;
  focusCountryFromExternal: (
    name: string,
    fallback?: Country,
    mode?: ExternalMapFocusMode,
  ) => void;
  clearPendingExternalFocus: () => void;
  selectRandomCountry: () => MapCountry | null;
  setActiveChip: (chip: MapFilterChip) => void;
  setMapMode: (mode: MapMode) => void;
  toggleMapMode: () => void;
  registerGlobeCamera: (handle: GlobeCameraHandle | null) => void;
  focusCountryOnGlobe: (name: string, duration?: number) => void;
  focusLatLngOnGlobe: (lat: number, lng: number, duration?: number) => void;
  getVisibleCountries: () => MapCountry[];
};

let mapCountriesLoadPromise: Promise<void> | null = null;

function resolveSelectedCountry(
  countries: MapCountry[],
  name: string,
): MapCountry | null {
  return countries.find((c) => c.name === name) ?? null;
}

function applyPendingExternalSelection(
  countries: MapCountry[],
  pendingName: string | null,
  pendingMode: ExternalMapFocusMode | null,
): Partial<MapState> {
  if (!pendingName || pendingMode === "spotlight") return {};
  const country = resolveSelectedCountry(countries, pendingName);
  return country ? { selectedCountry: country } : {};
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
  selectedCountry: null,
  pendingExternalFocusName: null,
  pendingExternalFocusMode: null,
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
          ...applyPendingExternalSelection(
            nextCountries,
            get().pendingExternalFocusName,
            get().pendingExternalFocusMode,
          ),
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

  selectCountry: (name) => {
    if (!name) {
      set({ selectedCountry: null });
      return;
    }

    const country = resolveSelectedCountry(get().countries, name);
    set({ selectedCountry: country });
  },

  focusCountryFromExternal: (name, fallback, mode = "region") => {
    const trimmed = name.trim();
    if (!trimmed) return;

    let country = resolveSelectedCountry(get().countries, trimmed);
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
      pendingExternalFocusMode: mode,
      selectedCountry: mode === "spotlight" ? null : country,
    });
  },

  clearPendingExternalFocus: () =>
    set({ pendingExternalFocusName: null, pendingExternalFocusMode: null }),

  selectRandomCountry: () => {
    const visible = get().getVisibleCountries();
    if (visible.length === 0) return null;

    const pick = visible[Math.floor(Math.random() * visible.length)] ?? null;
    if (pick) {
      set({ selectedCountry: pick });
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
      resolveSelectedCountry(countries, pendingExternalFocusName) ?? null;
    if (!country) return;

    handle.focusCountry(country, 650);
    get().clearPendingExternalFocus();
  },

  focusCountryOnGlobe: (name, duration) => {
    const country = resolveSelectedCountry(get().countries, name);
    if (!country) return;
    get().globeCamera?.focusCountry(country, duration);
  },

  focusLatLngOnGlobe: (lat, lng, duration) => {
    get().globeCamera?.focusLatLng(lat, lng, duration);
  },

  getVisibleCountries: () => {
    const { countries, activeChip } = get();
    return filterMapCountriesByChip(countries, activeChip);
  },
}));
