import { create } from "zustand";

import {
  TRAVEL_MAP_LEGEND_DEFAULT_VISIBILITY,
  type TravelMapLegendFilterId,
  type TravelMapLegendVisibility,
} from "@/constants/travel-map-legend";

type TravelMapLegendState = {
  visibility: TravelMapLegendVisibility;
  toggleFilter: (id: TravelMapLegendFilterId) => void;
  isFilterVisible: (id: TravelMapLegendFilterId) => boolean;
  resetFilters: () => void;
};

export const useTravelMapLegendStore = create<TravelMapLegendState>(
  (set, get) => ({
    visibility: { ...TRAVEL_MAP_LEGEND_DEFAULT_VISIBILITY },

    toggleFilter: (id) =>
      set((state) => ({
        visibility: {
          ...state.visibility,
          [id]: !state.visibility[id],
        },
      })),

    isFilterVisible: (id) => get().visibility[id],

    resetFilters: () =>
      set({ visibility: { ...TRAVEL_MAP_LEGEND_DEFAULT_VISIBILITY } }),
  }),
);
