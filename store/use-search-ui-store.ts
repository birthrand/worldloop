import { create } from "zustand";

export type SearchUiContext = "default" | "map" | "culture";

type SearchUiState = {
  isOpen: boolean;
  context: SearchUiContext;
  focusToken: number;
  submitNonce: number;
  query: string;
  region: string | null;
  resumeSearchOnReturn: boolean;
  openSearch: (context?: SearchUiContext) => void;
  closeSearch: () => void;
  /**
   * Hide overlay but keep query/region for resume-on-back.
   * Country detail covers the in-tab overlay via root stack — do not call on navigate.
   */
  hideSearchForDetail: () => void;
  clearResumeSearchOnReturn: () => void;
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
  resumeSearchOnReturn: false,
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
      resumeSearchOnReturn: false,
    }),
  hideSearchForDetail: () =>
    set({
      isOpen: false,
      resumeSearchOnReturn: true,
    }),
  clearResumeSearchOnReturn: () => set({ resumeSearchOnReturn: false }),
  setQuery: (query) => set({ query }),
  setRegion: (region) => set({ region }),
  requestSearchSubmit: () =>
    set((state) => ({ submitNonce: state.submitNonce + 1 })),
}));
