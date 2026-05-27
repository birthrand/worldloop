import { create } from "zustand";

type SearchUiState = {
  isOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

export const useSearchUiStore = create<SearchUiState>((set) => ({
  isOpen: false,
  openSearch: () => set({ isOpen: true }),
  closeSearch: () => set({ isOpen: false }),
}));
