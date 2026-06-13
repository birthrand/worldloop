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
  /** Country detail to restore when leaving map after a countryDetail handoff. */
  countryDetailReturnName: string | null;
  setActiveCountry: (country: MapCountry, source: SelectionSource) => void;
  setCountryDetailReturnName: (name: string | null) => void;
  clearActiveCountry: () => void;
};

export const useIdentityStore = create<IdentityState>((set) => ({
  activeCountry: null,
  selectionSource: null,
  countryDetailReturnName: null,

  setActiveCountry: (country, source) =>
    set({
      activeCountry: country,
      selectionSource: source,
    }),

  setCountryDetailReturnName: (name) => set({ countryDetailReturnName: name }),

  clearActiveCountry: () =>
    set({
      activeCountry: null,
      selectionSource: null,
    }),
}));
