import { create } from "zustand";

import { fetchDiscoverViewportCountries } from "@/lib/discover-viewport";
import {
  defaultDiscoveryScope,
  resolveViewportCountries,
  type CommitScopeFromMapInput,
} from "@/lib/discovery-scope";

import type { Country } from "@/types/country";
import type { DiscoveryScope, GeoEntity } from "@/types/geo";

export type DiscoveryQueueSource = "viewport" | "region" | "forYou" | "manual";

type SpatialContextState = {
  discoveryScope: DiscoveryScope;
  /** Countries matching current scope (ordered by viewport center). */
  viewportCountries: GeoEntity[];
  /** Names only — cheap selector for UI badges. */
  viewportCountryCount: number;
  /** Ordered country names — source of truth for Here feed + spatial shuffle. */
  queue: string[];
  queueSource: DiscoveryQueueSource;

  commitScopeFromMap: (input: CommitScopeFromMapInput) => void;
  setQueueFromViewport: (entities: GeoEntity[]) => void;
  setQueueFromCountries: (
    countries: Country[],
    source: DiscoveryQueueSource,
  ) => void;
  /** Returns the next name after `currentName`, or null at end of queue. */
  advanceQueue: (currentName: string) => string | null;
  enterHereMode: () => void;
  clearScope: () => void;
};

/** Reorder viewport entities to match the shared discovery queue. */
export function entitiesInQueueOrder(
  entities: GeoEntity[],
  queue: string[],
): GeoEntity[] {
  if (queue.length === 0) return entities;

  const byName = new Map(entities.map((entity) => [entity.name, entity]));
  const ordered: GeoEntity[] = [];

  for (const name of queue) {
    const entity = byName.get(name);
    if (entity) ordered.push(entity);
  }

  for (const entity of entities) {
    if (!queue.includes(entity.name)) {
      ordered.push(entity);
    }
  }

  return ordered;
}

export const useSpatialContextStore = create<SpatialContextState>(
  (set, get) => ({
    discoveryScope: defaultDiscoveryScope(),
    viewportCountries: [],
    viewportCountryCount: 0,
    queue: [],
    queueSource: "forYou",

    commitScopeFromMap: (input) => {
      const previousMode = get().discoveryScope.mode;
      const { scope, viewportCountries } = resolveViewportCountries(
        input,
        previousMode,
      );

      const nextQueue =
        scope.tier !== "world" && viewportCountries.length > 0
          ? viewportCountries.map((entity) => entity.name)
          : [];

      const settledAt = scope.settledAt;

      set({
        discoveryScope: scope,
        viewportCountries,
        viewportCountryCount: viewportCountries.length,
        queue: nextQueue,
        queueSource: nextQueue.length > 0 ? "viewport" : get().queueSource,
      });

      if (
        scope.tier !== "world" &&
        scope.bbox &&
        input.mapCountries.length > 0
      ) {
        const applyServerViewport = (serverEntities: GeoEntity[]) => {
          const current = get();
          if (current.discoveryScope.settledAt !== settledAt) return;
          if (serverEntities.length === 0) return;

          const serverQueue = serverEntities.map((entity) => entity.name);

          set({
            viewportCountries: serverEntities,
            viewportCountryCount: serverEntities.length,
            queue: serverQueue,
            queueSource: "viewport",
          });
        };

        void fetchDiscoverViewportCountries(
          {
            bbox: scope.bbox,
            viewportCenter: input.viewportCenter,
            focusedRegion: scope.focusedRegion,
            tier: scope.tier,
            mapCountries: input.mapCountries,
          },
          applyServerViewport,
        )
          .then(applyServerViewport)
          .catch(() => {
            /* client index already applied — keep fallback */
          });
      }
    },

    setQueueFromViewport: (entities) => {
      set({
        queue: entities.map((entity) => entity.name),
        queueSource: "viewport",
      });
    },

    setQueueFromCountries: (countries, source) => {
      set({
        queue: countries.map((country) => country.name),
        queueSource: source,
      });
    },

    advanceQueue: (currentName) => {
      const { queue } = get();
      const index = queue.indexOf(currentName);
      if (index < 0 || index >= queue.length - 1) return null;
      return queue[index + 1] ?? null;
    },

    enterHereMode: () => {
      set((state) => ({
        discoveryScope: { ...state.discoveryScope, mode: "here" },
      }));
    },

    clearScope: () => {
      set({
        discoveryScope: defaultDiscoveryScope(),
        viewportCountries: [],
        viewportCountryCount: 0,
        queue: [],
        queueSource: "forYou",
      });
    },
  }),
);
