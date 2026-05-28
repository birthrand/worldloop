import { create } from "zustand";

export type SearchUiContext = "default" | "map";

type SearchUiState = {
  isOpen: boolean;
  context: SearchUiContext;
  openSearch: (context?: SearchUiContext) => void;
  closeSearch: () => void;
};

export const useSearchUiStore = create<SearchUiState>((set) => ({
  isOpen: false,
  context: "default",
  openSearch: (context = "default") => set({ isOpen: true, context }),
  closeSearch: () => set({ isOpen: false, context: "default" }),
}));
