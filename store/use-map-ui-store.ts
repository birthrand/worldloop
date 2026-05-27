import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_MAP_BOUNDARY_STYLE,
  normalizeBoundaryStyle,
  type MapBoundaryStyleSettings,
} from "@/constants/map-boundary-style";

export type MapDisplayMode = "globalPulse" | "explore";
export type FeaturedShortcut = "forYou" | "newActivity";

type MapUiState = {
  hasSeenMapOnboarding: boolean;
  displayMode: MapDisplayMode;
  focusedRegion: string | null;
  featuredShortcut: FeaturedShortcut | null;
  /** Random-country pick: show only this pin until the user opens the preview card. */
  spotlightCountryName: string | null;
  boundaryStyle: MapBoundaryStyleSettings;
  dismissMapOnboarding: () => void;
  setDisplayMode: (mode: MapDisplayMode) => void;
  setFocusedRegion: (region: string | null) => void;
  setFeaturedShortcut: (shortcut: FeaturedShortcut | null) => void;
  setSpotlightCountry: (name: string | null) => void;
  setBoundaryStyle: (style: MapBoundaryStyleSettings) => void;
  resetBoundaryStyle: () => void;
  resetGlobalPulse: () => void;
};

export const useMapUiStore = create<MapUiState>()(
  persist(
    (set) => ({
      hasSeenMapOnboarding: false,
      displayMode: "globalPulse",
      focusedRegion: null,
      featuredShortcut: null,
      spotlightCountryName: null,
      boundaryStyle: DEFAULT_MAP_BOUNDARY_STYLE,

      dismissMapOnboarding: () => set({ hasSeenMapOnboarding: true }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setFocusedRegion: (region) => set({ focusedRegion: region }),
      setFeaturedShortcut: (shortcut) => set({ featuredShortcut: shortcut }),
      setSpotlightCountry: (name) => set({ spotlightCountryName: name }),
      setBoundaryStyle: (style) => set({ boundaryStyle: style }),
      resetBoundaryStyle: () =>
        set({ boundaryStyle: DEFAULT_MAP_BOUNDARY_STYLE }),

      resetGlobalPulse: () =>
        set({
          displayMode: "globalPulse",
          focusedRegion: null,
          featuredShortcut: null,
          spotlightCountryName: null,
        }),
    }),
    {
      name: "worldloop-map-ui",
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<MapUiState> | undefined;
        return {
          ...currentState,
          ...persisted,
          boundaryStyle: normalizeBoundaryStyle(persisted?.boundaryStyle),
        };
      },
    },
  ),
);

