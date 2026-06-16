import { create } from "zustand";

import type { MapCountry } from "@/types/country";

export type SelectionSource =
  | "fab"
  | "shuffle"
  | "search"
  | "explore"
  | "countryDetail"
  | "travelMap"
  | "mapTap"
  | null;

type IdentityState = {
  activeCountry: MapCountry | null;
  selectionSource: SelectionSource;
  /** True from Explore → Map until the user backs out to Explore. */
  exploreMapSessionActive: boolean;
  /** True from Profile → Travel map until the user backs out to Profile. */
  travelMapSessionActive: boolean;
  /** Country detail to restore when leaving map after a countryDetail handoff. */
  countryDetailReturnName: string | null;
  /** Country detail should return to the explore map preview (not Explore card). */
  countryDetailReturnToMap: boolean;
  /** Travel map landmark preview to restore after a country-detail detour. */
  travelLandmarkPreviewPinId: string | null;
  setActiveCountry: (country: MapCountry, source: SelectionSource) => void;
  setExploreMapSessionActive: (active: boolean) => void;
  setTravelMapSessionActive: (active: boolean) => void;
  setCountryDetailReturnName: (name: string | null) => void;
  setCountryDetailReturnToMap: (active: boolean) => void;
  setTravelLandmarkPreviewPinId: (pinId: string | null) => void;
  clearActiveCountry: () => void;
};

export const useIdentityStore = create<IdentityState>((set) => ({
  activeCountry: null,
  selectionSource: null,
  exploreMapSessionActive: false,
  travelMapSessionActive: false,
  countryDetailReturnName: null,
  countryDetailReturnToMap: false,
  travelLandmarkPreviewPinId: null,

  setActiveCountry: (country, source) =>
    set({
      activeCountry: country,
      selectionSource: source,
    }),

  setExploreMapSessionActive: (active) =>
    set({ exploreMapSessionActive: active }),

  setTravelMapSessionActive: (active) =>
    set({ travelMapSessionActive: active }),

  setCountryDetailReturnName: (name) => set({ countryDetailReturnName: name }),

  setCountryDetailReturnToMap: (active) =>
    set({ countryDetailReturnToMap: active }),

  setTravelLandmarkPreviewPinId: (pinId) =>
    set({ travelLandmarkPreviewPinId: pinId }),

  clearActiveCountry: () =>
    set({
      activeCountry: null,
      selectionSource: null,
    }),
}));
