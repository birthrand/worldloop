import { router } from "expo-router";

import { useCultureFeedStore } from "@/store/use-culture-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { Country } from "@/types/country";

/** Close search, focus country in the culture feed, record view, and open Culture. */
export function openCountryInCulture(country: Country): void {
  useSearchUiStore.getState().closeSearch();
  useCultureFeedStore.getState().focusCountryInCulture(country);
  useRecentlyViewedStore.getState().recordView(country);
  router.push("/(tabs)/culture");
}
