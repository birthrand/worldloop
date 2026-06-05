import { router } from "expo-router";

import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import {
  entitiesInQueueOrder,
  useSpatialContextStore,
} from "@/store/use-spatial-context-store";
import type { Country } from "@/types/country";
import type { DiscoveryScopeMode } from "@/types/geo";

export type OpenCountryInExploreOptions = {
  /** Keep viewport-driven Here feed when opening from map while in Here scope. */
  preserveHereMode?: boolean;
  /** Explicit discovery mode — search/home should omit or use forYou. */
  mode?: Extract<DiscoveryScopeMode, "forYou" | "here">;
  /** When Here queue exists, focus index in feed without rebuilding order. */
  preserveQueue?: boolean;
};

/** Close search, focus country in feed, record view, and open Explore. */
export function openCountryInExplore(
  country: Country,
  options?: OpenCountryInExploreOptions,
): void {
  useSearchUiStore.getState().closeSearch();

  const spatial = useSpatialContextStore.getState();
  const feed = useCountryFeedStore.getState();
  const hereMode =
    options?.mode === "here" ||
    options?.preserveHereMode ||
    spatial.discoveryScope.mode === "here";

  if (hereMode) {
    useSpatialContextStore.getState().enterHereMode();
    feed.setDiscoveryMode("here");
  } else if (!options?.preserveQueue) {
    feed.setDiscoveryMode("forYou");
  }

  const canPreserveQueue =
    options?.preserveQueue === true && spatial.queue.length > 0;

  if (canPreserveQueue) {
    const focused = feed.focusCountryInDiscoveryQueue(country.name);
    if (focused) {
      useRecentlyViewedStore.getState().recordView(country);
      router.push("/(tabs)/explore");
      return;
    }

    const orderedEntities = entitiesInQueueOrder(
      spatial.viewportCountries,
      spatial.queue,
    );
    void feed.loadHereFeed(orderedEntities, { focusCountryName: country.name });
    useRecentlyViewedStore.getState().recordView(country);
    router.push("/(tabs)/explore");
    return;
  }

  if (!hereMode) {
    useCountryFeedStore.getState().setDiscoveryMode("forYou");
  }

  useCountryFeedStore.getState().focusCountryInFeed(country);
  useRecentlyViewedStore.getState().recordView(country);
  router.push("/(tabs)/explore");
}
