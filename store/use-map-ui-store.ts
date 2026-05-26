import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type MapDisplayMode = "globalPulse" | "explore";
export type FeaturedShortcut = "trending" | "forYou" | "newActivity";

type MapUiState = {
  hasSeenMapOnboarding: boolean;
  displayMode: MapDisplayMode;
  focusedRegion: string | null;
  featuredShortcut: FeaturedShortcut | null;
  dismissMapOnboarding: () => void;
  setDisplayMode: (mode: MapDisplayMode) => void;
  setFocusedRegion: (region: string | null) => void;
  setFeaturedShortcut: (shortcut: FeaturedShortcut | null) => void;
  resetGlobalPulse: () => void;
};

export const useMapUiStore = create<MapUiState>()(
  persist(
    (set) => ({
      hasSeenMapOnboarding: false,
      displayMode: "globalPulse",
      focusedRegion: null,
      featuredShortcut: null,

      dismissMapOnboarding: () => set({ hasSeenMapOnboarding: true }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setFocusedRegion: (region) => set({ focusedRegion: region }),
      setFeaturedShortcut: (shortcut) => set({ featuredShortcut: shortcut }),

      resetGlobalPulse: () =>
        set({
          displayMode: "globalPulse",
          focusedRegion: null,
          featuredShortcut: null,
        }),
    }),
    {
      name: "worldloop-map-ui",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

