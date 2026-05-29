import { create } from "zustand";

import type { MapCountry } from "@/types/country";

export type SelectionSource =
  | "fab"
  | "shuffle"
  | "search"
  | "explore"
  | "mapTap"
  | null;

type IdentityState = {
  activeCountry: MapCountry | null;
  selectionSource: SelectionSource;
  setActiveCountry: (country: MapCountry, source: SelectionSource) => void;
  clearActiveCountry: () => void;
};

export const useIdentityStore = create<IdentityState>((set) => ({
  activeCountry: null,
  selectionSource: null,

  setActiveCountry: (country, source) =>
    set({
      activeCountry: country,
      selectionSource: source,
    }),

  clearActiveCountry: () =>
    set({
      activeCountry: null,
      selectionSource: null,
    }),
}));
