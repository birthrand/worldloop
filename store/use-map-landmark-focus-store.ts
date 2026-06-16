import { create } from "zustand";

import type { MapLandmarkFocus } from "@/types/map-presentation";

type MapLandmarkFocusState = {
  activeLandmark: MapLandmarkFocus | null;
  setActiveLandmark: (landmark: MapLandmarkFocus | null) => void;
  clearActiveLandmark: () => void;
};

export const useMapLandmarkFocusStore = create<MapLandmarkFocusState>(
  (set) => ({
    activeLandmark: null,

    setActiveLandmark: (landmark) => set({ activeLandmark: landmark }),

    clearActiveLandmark: () => set({ activeLandmark: null }),
  }),
);
