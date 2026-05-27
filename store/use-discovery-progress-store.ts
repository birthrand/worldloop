import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Mon–Sun completion flags (index 0 = Monday). */
export type WeekProgress = [
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
];

type DiscoveryProgressState = {
  streakDays: number;
  weekProgress: WeekProgress;
  countriesExplored: number;
  quizzesCompleted: number;
  worldProgressPercent: number;
};

const DEFAULT_WEEK_PROGRESS: WeekProgress = [
  true,
  true,
  true,
  true,
  true,
  true,
  false,
];

export const useDiscoveryProgressStore = create<DiscoveryProgressState>()(
  persist(
    () => ({
      streakDays: 12,
      weekProgress: DEFAULT_WEEK_PROGRESS,
      countriesExplored: 28,
      quizzesCompleted: 56,
      worldProgressPercent: 28,
    }),
    {
      name: "worldloop-discovery-progress",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
