import { create } from "zustand";

import type {
  MapPresentationIntent,
  MapPresentationMode,
} from "@/types/map-presentation";

type MapPresentationState = {
  mode: MapPresentationMode;
  pendingIntent: MapPresentationIntent | null;
  setMode: (mode: MapPresentationMode) => void;
  applyIntent: (intent: MapPresentationIntent) => void;
  clearPendingIntent: () => void;
  resetPresentation: () => void;
};

export const useMapPresentationStore = create<MapPresentationState>((set) => ({
  mode: "idle",
  pendingIntent: null,

  setMode: (mode) => set({ mode }),

  applyIntent: (intent) =>
    set({
      mode: intent.mode,
      pendingIntent: intent,
    }),

  clearPendingIntent: () => set({ pendingIntent: null }),

  resetPresentation: () =>
    set({
      mode: "idle",
      pendingIntent: null,
    }),
}));
