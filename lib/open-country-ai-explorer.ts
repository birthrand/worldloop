import { router } from "expo-router";

import { seedCachedCountryProfile } from "@/lib/country-profile-cache";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

/** Push the AI Country Explorer deep-dive for a country (map sheet → stack). */
export function openCountryAiExplorer(country: Country): void {
  seedCachedCountryProfile(country);
  useRecentlyViewedStore.getState().recordView(country);

  const { countries, currentIndex } = useCountryFeedStore.getState();
  void prefetchCountryProfile(country.name);
  const neighbors = [
    countries[currentIndex - 1],
    countries[currentIndex + 1],
  ];
  for (const neighbor of neighbors) {
    if (neighbor) void prefetchCountryProfile(neighbor.name);
  }

  router.push({
    pathname: "/country/[name]/ai-explorer",
    params: { name: country.name },
  });
}
