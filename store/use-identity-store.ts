import { create } from "zustand";

import type { MapCountry } from "@/types/country";

export type SelectionSource =
  | "fab"
  | "shuffle"
  | "search"
  | "explore"
  | "countryDetail"
  | "mapTap"
  | null;

type IdentityState = {
  activeCountry: MapCountry | null;
  selectionSource: SelectionSource;
  /** True from Explore → Map until the user backs out to Explore. */
  exploreMapSessionActive: boolean;
  /** Country detail to restore when leaving map after a countryDetail handoff. */
  countryDetailReturnName: string | null;
  /** Country detail should return to the explore map preview (not Explore card). */
  countryDetailReturnToMap: boolean;
  setActiveCountry: (country: MapCountry, source: SelectionSource) => void;
  setExploreMapSessionActive: (active: boolean) => void;
  setCountryDetailReturnName: (name: string | null) => void;
  setCountryDetailReturnToMap: (active: boolean) => void;
  clearActiveCountry: () => void;
};

export const useIdentityStore = create<IdentityState>((set) => ({
  activeCountry: null,
  selectionSource: null,
  exploreMapSessionActive: false,
  countryDetailReturnName: null,
  countryDetailReturnToMap: false,

  setActiveCountry: (country, source) =>
    set({
      activeCountry: country,
      selectionSource: source,
    }),

  setExploreMapSessionActive: (active) =>
    set({ exploreMapSessionActive: active }),

  setCountryDetailReturnName: (name) => set({ countryDetailReturnName: name }),

  setCountryDetailReturnToMap: (active) =>
    set({ countryDetailReturnToMap: active }),

  clearActiveCountry: () =>
    set({
      activeCountry: null,
      selectionSource: null,
    }),
}));
