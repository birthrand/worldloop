import { create } from "zustand";

import type { SelectionSource } from "@/store/use-identity-store";

export type TransitionState = "idle" | "entering" | "focusing";

export type EntryMethod = Exclude<SelectionSource, null>;

type ExperienceState = {
  transitionState: TransitionState;
  pulsing: boolean;
  spotlightActive: boolean;
  entryMethod: EntryMethod | null;
  cameraTransitioning: boolean;

  startTransition: (method: EntryMethod) => void;
  endTransition: () => void;
  setSpotlight: (active: boolean) => void;
  setPulsing: (active: boolean) => void;
  resetExperience: () => void;
};

const EXPERIENCE_IDLE = {
  transitionState: "idle" as const,
  pulsing: false,
  spotlightActive: false,
  entryMethod: null,
  cameraTransitioning: false,
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  ...EXPERIENCE_IDLE,

  startTransition: (method) =>
    set({
      transitionState: "entering",
      entryMethod: method,
      pulsing: true,
      spotlightActive: false,
      cameraTransitioning: true,
    }),

  endTransition: () =>
    set({
      transitionState: "idle",
      pulsing: false,
      cameraTransitioning: false,
    }),

  setSpotlight: (active) => set({ spotlightActive: active }),

  setPulsing: (active) => set({ pulsing: active }),

  resetExperience: () => set(EXPERIENCE_IDLE),
}));
