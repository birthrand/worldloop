import { router } from "expo-router";

import { hasCachedCountryInViewport } from "@/lib/load-countries-for-discovery";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import {
  entitiesInQueueOrder,
  useSpatialContextStore,
} from "@/store/use-spatial-context-store";

/** Open Explore in Here mode with countries from the current map viewport. */
export async function openExploreHere(): Promise<void> {
  const { viewportCountries, queue } = useSpatialContextStore.getState();

  if (viewportCountries.length === 0) return;

  useSpatialContextStore.getState().enterHereMode();

  const orderedEntities = entitiesInQueueOrder(viewportCountries, queue);
  const loadHereFeed = useCountryFeedStore.getState().loadHereFeed;
  const hasCached = await hasCachedCountryInViewport(orderedEntities);

  if (hasCached) {
    void loadHereFeed(orderedEntities);
    router.push("/(tabs)/explore");
    return;
  }

  router.push("/(tabs)/explore");
  await loadHereFeed(orderedEntities);
}
