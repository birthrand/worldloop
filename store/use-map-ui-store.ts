import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_MAP_BOUNDARY_STYLE,
  migrateLegacyCountryHighlightColorToAmber,
  migrateLegacyFillColorToAmber,
  normalizeBoundaryStyle,
  type MapBoundaryStyleSettings,
} from "@/constants/map-boundary-style";

export type MapDisplayMode = "globalPulse" | "explore";
export type FeaturedShortcut = "all" | "terrain" | "saved";

/** Country pin display on the 2D map: flag, dot circle, or hidden. */
export type CountryMarkerDisplayMode = "flag" | "circle" | "hidden";

export const COUNTRY_MARKER_DISPLAY_CYCLE: CountryMarkerDisplayMode[] = [
  "flag",
  "circle",
  "hidden",
];

export function nextCountryMarkerDisplayMode(
  current: CountryMarkerDisplayMode,
): CountryMarkerDisplayMode {
  const index = COUNTRY_MARKER_DISPLAY_CYCLE.indexOf(current);
  if (index < 0) return "flag";
  return COUNTRY_MARKER_DISPLAY_CYCLE[
    (index + 1) % COUNTRY_MARKER_DISPLAY_CYCLE.length
  ]!;
}

/** 3D globe: yellow pins visible whenever mode is not hidden. */
export function isGlobeYellowPinsVisible(
  mode: CountryMarkerDisplayMode,
): boolean {
  return mode !== "hidden";
}

/** 3D globe: flag control toggles yellow pins only (flag ↔ hidden). */
export function toggleGlobeYellowPins(
  mode: CountryMarkerDisplayMode,
): CountryMarkerDisplayMode {
  return mode === "hidden" ? "flag" : "hidden";
}

function normalizeCountryMarkerMode(
  value: unknown,
  legacyShowFlags?: boolean,
): CountryMarkerDisplayMode {
  if (value === "flag" || value === "circle" || value === "hidden") {
    return value;
  }
  if (typeof legacyShowFlags === "boolean") {
    return legacyShowFlags ? "flag" : "circle";
  }
  return "flag";
}

type MapUiState = {
  hasSeenMapOnboarding: boolean;
  hasSeenRandomCountryHint: boolean;
  displayMode: MapDisplayMode;
  focusedRegion: string | null;
  featuredShortcut: FeaturedShortcut | null;
  countryMarkerMode: CountryMarkerDisplayMode;
  /** When false, country/continent boundary polygons are hidden on the 2D map. */
  showBoundaryLines: boolean;
  boundaryStyle: MapBoundaryStyleSettings;
  /** Bumped on every boundary style write so 2D polygons remount on RN Maps. */
  boundaryStyleRevision: number;
  dismissMapOnboarding: () => void;
  dismissRandomCountryHint: () => void;
  setDisplayMode: (mode: MapDisplayMode) => void;
  setFocusedRegion: (region: string | null) => void;
  setFeaturedShortcut: (shortcut: FeaturedShortcut | null) => void;
  setCountryMarkerMode: (mode: CountryMarkerDisplayMode) => void;
  cycleCountryMarkerMode: () => void;
  setShowBoundaryLines: (show: boolean) => void;
  setBoundaryStyle: (style: MapBoundaryStyleSettings) => void;
  resetBoundaryStyle: () => void;
  resetGlobalPulse: () => void;
  /** Clears continent/shortcut session state (not persisted across app restarts). */
  resetMapExplorationSession: () => void;
};

/** Fields that belong to the current map session only — never written to AsyncStorage. */
const MAP_EXPLORATION_SESSION_DEFAULTS = {
  displayMode: "globalPulse" as MapDisplayMode,
  focusedRegion: null,
  featuredShortcut: "all",
};

export const useMapUiStore = create<MapUiState>()(
  persist(
    (set) => ({
      hasSeenMapOnboarding: false,
      hasSeenRandomCountryHint: false,
      displayMode: "globalPulse",
      focusedRegion: null,
      featuredShortcut: "all",
      countryMarkerMode: "flag",
      showBoundaryLines: true,
      boundaryStyle: DEFAULT_MAP_BOUNDARY_STYLE,
      boundaryStyleRevision: 0,

      dismissMapOnboarding: () => set({ hasSeenMapOnboarding: true }),
      dismissRandomCountryHint: () => set({ hasSeenRandomCountryHint: true }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setFocusedRegion: (region) => set({ focusedRegion: region }),
      setFeaturedShortcut: (shortcut) => set({ featuredShortcut: shortcut }),
      setCountryMarkerMode: (mode) => set({ countryMarkerMode: mode }),
      cycleCountryMarkerMode: () =>
        set((state) => ({
          countryMarkerMode: nextCountryMarkerDisplayMode(
            state.countryMarkerMode,
          ),
        })),
      setShowBoundaryLines: (show) => set({ showBoundaryLines: show }),
      setBoundaryStyle: (style) =>
        set((state) => ({
          boundaryStyle: normalizeBoundaryStyle(style),
          boundaryStyleRevision: state.boundaryStyleRevision + 1,
        })),
      resetBoundaryStyle: () =>
        set((state) => ({
          boundaryStyle: DEFAULT_MAP_BOUNDARY_STYLE,
          boundaryStyleRevision: state.boundaryStyleRevision + 1,
        })),

      resetGlobalPulse: () => set(MAP_EXPLORATION_SESSION_DEFAULTS),

      resetMapExplorationSession: () => set(MAP_EXPLORATION_SESSION_DEFAULTS),
    }),
    {
      name: "worldloop-map-ui",
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenMapOnboarding: state.hasSeenMapOnboarding,
        hasSeenRandomCountryHint: state.hasSeenRandomCountryHint,
        countryMarkerMode: state.countryMarkerMode,
        showBoundaryLines: state.showBoundaryLines,
        boundaryStyle: state.boundaryStyle,
      }),
      migrate: (persistedState, version) => {
        const persisted = persistedState as
          | (Partial<MapUiState> & { showCountryFlags?: boolean })
          | undefined;
        if (!persisted) return persistedState;
        const {
          displayMode: _displayMode,
          focusedRegion: _focusedRegion,
          featuredShortcut: _featuredShortcut,
          showCountryFlags,
          boundaryStyle: persistedBoundaryStyle,
          ...settings
        } = persisted;

        let boundaryStyle = normalizeBoundaryStyle(persistedBoundaryStyle);
        if (version < 3) {
          boundaryStyle = migrateLegacyFillColorToAmber(boundaryStyle);
        }
        if (version < 4) {
          boundaryStyle = normalizeBoundaryStyle(boundaryStyle);
        }
        boundaryStyle =
          migrateLegacyCountryHighlightColorToAmber(boundaryStyle);

        return { ...settings, boundaryStyle };
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | (Partial<MapUiState> & { showCountryFlags?: boolean })
          | undefined;
        return {
          ...currentState,
          ...MAP_EXPLORATION_SESSION_DEFAULTS,
          hasSeenMapOnboarding:
            persisted?.hasSeenMapOnboarding ??
            currentState.hasSeenMapOnboarding,
          hasSeenRandomCountryHint:
            persisted?.hasSeenRandomCountryHint ??
            currentState.hasSeenRandomCountryHint,
          showBoundaryLines:
            persisted?.showBoundaryLines ?? currentState.showBoundaryLines,
          countryMarkerMode: normalizeCountryMarkerMode(
            persisted?.countryMarkerMode,
            persisted?.showCountryFlags,
          ),
          boundaryStyle: migrateLegacyCountryHighlightColorToAmber(
            migrateLegacyFillColorToAmber(
              normalizeBoundaryStyle(persisted?.boundaryStyle),
            ),
          ),
        };
      },
    },
  ),
);
