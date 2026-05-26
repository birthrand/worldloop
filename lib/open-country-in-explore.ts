import { router } from "expo-router";

import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { Country } from "@/types/country";

/** Close search, focus country in feed, record view, and open Explore. */
export function openCountryInExplore(country: Country): void {
  useSearchUiStore.getState().closeSearch();
  useCountryFeedStore.getState().focusCountryInFeed(country);
  useRecentlyViewedStore.getState().recordView(country);
  router.push("/(tabs)/explore");
}
