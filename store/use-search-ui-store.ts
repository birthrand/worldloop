import { create } from "zustand";

export type SearchUiContext = "default" | "map";

type SearchUiState = {
  isOpen: boolean;
  context: SearchUiContext;
  focusToken: number;
  submitNonce: number;
  query: string;
  region: string | null;
  openSearch: (context?: SearchUiContext) => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setRegion: (region: string | null) => void;
  requestSearchSubmit: () => void;
};

export const useSearchUiStore = create<SearchUiState>((set) => ({
  isOpen: false,
  context: "default",
  focusToken: 0,
  submitNonce: 0,
  query: "",
  region: null,
  openSearch: (context = "default") =>
    set((state) => ({
      isOpen: true,
      context,
      focusToken: state.focusToken + 1,
    })),
  closeSearch: () =>
    set({
      isOpen: false,
      context: "default",
      query: "",
      region: null,
    }),
  setQuery: (query) => set({ query }),
  setRegion: (region) => set({ region }),
  requestSearchSubmit: () =>
    set((state) => ({ submitNonce: state.submitNonce + 1 })),
}));
