import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  applyDailyActivity,
  computeWorldProgressPercent,
  createEmptyWeekProgress,
  resolveVisitCountryId,
  type WeekProgress,
} from "@/lib/discovery-progress";
import type { Country } from "@/types/country";

/** Mon–Sun completion flags (index 0 = Monday). */
export type { WeekProgress } from "@/lib/discovery-progress";

type DiscoveryProgressState = {
  /** Unique country ids (prefer cca2). */
  visitedCountryIds: string[];
  visitedAtByCountryId: Record<string, number>;
  lastActiveDate: string | null;
  streakDays: number;
  weekProgress: WeekProgress;
  countriesExplored: number;
  worldProgressPercent: number;
  quizzesCompleted: number;

  recordCountryVisit: (
    country: Pick<Country, "name" | "cca2"> & { flag?: string },
  ) => void;
  /** Streak tick on app open (see applyDailyActivity streak rule). */
  recordAppOpen: () => void;
  /** Dev only — clears visited countries and stats. */
  resetProgress: () => void;
  /** Dev only — seed a few visits for manual testing. */
  seedSampleVisits: () => void;
  isCountryVisited: (
    country: Pick<Country, "name" | "cca2"> & { flag?: string },
  ) => boolean;
};

const INITIAL_STATE = {
  visitedCountryIds: [] as string[],
  visitedAtByCountryId: {} as Record<string, number>,
  lastActiveDate: null as string | null,
  streakDays: 0,
  weekProgress: createEmptyWeekProgress(),
  countriesExplored: 0,
  worldProgressPercent: 0,
  quizzesCompleted: 0,
};

function recomputeDerived(
  visitedCountryIds: string[],
): Pick<DiscoveryProgressState, "countriesExplored" | "worldProgressPercent"> {
  const count = visitedCountryIds.length;
  return {
    countriesExplored: count,
    worldProgressPercent: computeWorldProgressPercent(count),
  };
}

export const useDiscoveryProgressStore = create<DiscoveryProgressState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      recordCountryVisit: (country) => {
        const id = resolveVisitCountryId(country);
        if (!id) return;

        const state = get();
        const isNewVisit = !state.visitedCountryIds.includes(id);
        const daily = applyDailyActivity({
          streakDays: state.streakDays,
          lastActiveDate: state.lastActiveDate,
          weekProgress: state.weekProgress,
        });

        if (!isNewVisit) {
          set({
            streakDays: daily.streakDays,
            lastActiveDate: daily.lastActiveDate,
            weekProgress: daily.weekProgress,
          });
          return;
        }

        const visitedCountryIds = [...state.visitedCountryIds, id];
        const streakDays = daily.streakDays === 0 ? 1 : daily.streakDays;
        set({
          visitedCountryIds,
          visitedAtByCountryId: {
            ...state.visitedAtByCountryId,
            [id]: Date.now(),
          },
          streakDays,
          lastActiveDate: daily.lastActiveDate,
          weekProgress: daily.weekProgress,
          ...recomputeDerived(visitedCountryIds),
        });
      },

      recordAppOpen: () => {
        const state = get();
        const daily = applyDailyActivity({
          streakDays: state.streakDays,
          lastActiveDate: state.lastActiveDate,
          weekProgress: state.weekProgress,
        });

        set({
          streakDays: daily.streakDays,
          lastActiveDate: daily.lastActiveDate,
          weekProgress: daily.weekProgress,
        });
      },

      resetProgress: () => {
        set({ ...INITIAL_STATE, weekProgress: createEmptyWeekProgress() });
      },

      seedSampleVisits: () => {
        const samples = [
          { name: "Japan", cca2: "JP" },
          { name: "Italy", cca2: "IT" },
          { name: "Peru", cca2: "PE" },
        ] as const;

        for (const sample of samples) {
          get().recordCountryVisit(sample);
        }
      },

      isCountryVisited: (country) => {
        const id = resolveVisitCountryId(country);
        return get().visitedCountryIds.includes(id);
      },
    }),
    {
      name: "worldloop-discovery-progress",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (!Array.isArray(state.visitedCountryIds)) {
          state.visitedCountryIds = [];
          state.visitedAtByCountryId = {};
          state.lastActiveDate = null;
          state.weekProgress = createEmptyWeekProgress();
        }

        if (
          typeof state.visitedAtByCountryId !== "object" ||
          state.visitedAtByCountryId === null
        ) {
          state.visitedAtByCountryId = {};
        }
        if (state.lastActiveDate === undefined) {
          state.lastActiveDate = null;
        }
        state.weekProgress = state.weekProgress ?? createEmptyWeekProgress();
        state.quizzesCompleted = state.quizzesCompleted ?? 0;

        const derived = recomputeDerived(state.visitedCountryIds);
        state.countriesExplored = derived.countriesExplored;
        state.worldProgressPercent = derived.worldProgressPercent;
      },
    },
  ),
);
