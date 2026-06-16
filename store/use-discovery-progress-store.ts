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

export type VisitedCountrySnapshot = Pick<Country, "name" | "cca2" | "flag">;

type DiscoveryProgressState = {
  /** Unique country ids (prefer cca2). */
  visitedCountryIds: string[];
  visitedAtByCountryId: Record<string, number>;
  /** Lightweight country snapshots for profile/map UI when feed data is absent. */
  visitedCountryById: Record<string, VisitedCountrySnapshot>;
  lastActiveDate: string | null;
  streakDays: number;
  weekProgress: WeekProgress;
  countriesExplored: number;
  worldProgressPercent: number;
  quizzesCompleted: number;

  recordCountryVisit: (
    country: Pick<Country, "name" | "cca2"> & { flag?: string },
  ) => void;
  toggleCountryVisited: (
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
  visitedCountryById: {} as Record<string, VisitedCountrySnapshot>,
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

const DISCOVERY_PROGRESS_STORAGE_VERSION = 2;

function clearVisitedProgress(
  state: DiscoveryProgressState,
): DiscoveryProgressState {
  return {
    ...state,
    visitedCountryIds: [],
    visitedAtByCountryId: {},
    visitedCountryById: {},
    countriesExplored: 0,
    worldProgressPercent: 0,
  };
}
function toVisitedSnapshot(
  country: Pick<Country, "name" | "cca2"> & { flag?: string },
): VisitedCountrySnapshot {
  return {
    name: country.name.trim(),
    cca2: country.cca2?.trim().toUpperCase() ?? "",
    flag: country.flag ?? "",
  };
}

export const useDiscoveryProgressStore = create<DiscoveryProgressState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      toggleCountryVisited: (country) => {
        const id = resolveVisitCountryId(country);
        if (!id) return;

        const state = get();
        if (state.visitedCountryIds.includes(id)) {
          const visitedCountryIds = state.visitedCountryIds.filter(
            (visitedId) => visitedId !== id,
          );
          const { [id]: _removedAt, ...visitedAtByCountryId } =
            state.visitedAtByCountryId;
          const { [id]: _removedCountry, ...visitedCountryById } =
            state.visitedCountryById;

          set({
            visitedCountryIds,
            visitedAtByCountryId,
            visitedCountryById,
            ...recomputeDerived(visitedCountryIds),
          });
          return;
        }

        get().recordCountryVisit(country);
      },

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
          visitedCountryById: {
            ...state.visitedCountryById,
            [id]: toVisitedSnapshot(country),
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
      version: DISCOVERY_PROGRESS_STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as DiscoveryProgressState;
        if (version < DISCOVERY_PROGRESS_STORAGE_VERSION) {
          return clearVisitedProgress(state);
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (!Array.isArray(state.visitedCountryIds)) {
          state.visitedCountryIds = [];
          state.visitedAtByCountryId = {};
          state.visitedCountryById = {};
          state.lastActiveDate = null;
          state.weekProgress = createEmptyWeekProgress();
        }

        if (
          typeof state.visitedAtByCountryId !== "object" ||
          state.visitedAtByCountryId === null
        ) {
          state.visitedAtByCountryId = {};
        }
        if (
          typeof state.visitedCountryById !== "object" ||
          state.visitedCountryById === null
        ) {
          state.visitedCountryById = {};
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
