import { create } from "zustand";

type CountryDetailFocusState = {
  focusLandmarkId: string | null;
  setFocusLandmarkId: (landmarkId: string | null) => void;
  /** Read and clear the pending landmark focus id (one-shot). */
  consumeFocusLandmarkId: () => string | null;
};

export const useCountryDetailFocusStore = create<CountryDetailFocusState>(
  (set, get) => ({
    focusLandmarkId: null,

    setFocusLandmarkId: (landmarkId) => set({ focusLandmarkId: landmarkId }),

    consumeFocusLandmarkId: () => {
      const { focusLandmarkId } = get();
      if (!focusLandmarkId) return null;
      set({ focusLandmarkId: null });
      return focusLandmarkId;
    },
  }),
);
