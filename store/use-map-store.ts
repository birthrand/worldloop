import { create } from "zustand";

import { fetchMapCountries } from "@/lib/api";
import { isValidLatLng } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

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
  resetCamera: () => void;
  zoomBy: (direction: "in" | "out") => void;
};

type MapState = {
  countries: MapCountry[];
  status: MapStatus;
  error: string | null;
  selectedCountry: MapCountry | null;
  activeChip: MapFilterChip;
  mapMode: MapMode;
  globeCamera: GlobeCameraHandle | null;
  loadMapCountries: () => Promise<void>;
  selectCountry: (name: string | null) => void;
  selectRandomCountry: () => MapCountry | null;
  setActiveChip: (chip: MapFilterChip) => void;
  setMapMode: (mode: MapMode) => void;
  toggleMapMode: () => void;
  registerGlobeCamera: (handle: GlobeCameraHandle | null) => void;
  focusCountryOnGlobe: (name: string, duration?: number) => void;
  getVisibleCountries: () => MapCountry[];
};

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
  activeChip: "all",
  mapMode: "2d",
  globeCamera: null,

  loadMapCountries: async () => {
    const { status } = get();
    if (status === "loading") return;

    set({ status: "loading", error: null });

    try {
      const { data } = await fetchMapCountries();
      set({
        countries: withValidCoordinates(data),
        status: "idle",
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load map countries";
      set({ status: "error", error: message });
    }
  },

  selectCountry: (name) => {
    if (!name) {
      set({ selectedCountry: null });
      return;
    }

    const country = get().countries.find((c) => c.name === name) ?? null;
    set({ selectedCountry: country });
  },

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

  registerGlobeCamera: (handle) => set({ globeCamera: handle }),

  focusCountryOnGlobe: (name, duration) => {
    const country = get().countries.find((c) => c.name === name) ?? null;
    if (!country) return;
    get().globeCamera?.focusCountry(country, duration);
  },

  getVisibleCountries: () => {
    const { countries, activeChip } = get();
    return filterMapCountriesByChip(countries, activeChip);
  },
}));
