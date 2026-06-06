import { router } from "expo-router";

import {
  getCachedCountryProfile,
  isCountryProfileEnriched,
  seedCachedCountryProfile,
} from "@/lib/country-profile-cache";
import {
  ensureCountryProfileReady,
  prefetchCountryProfile,
  warmCountryProfileOnInteraction,
} from "@/lib/prefetch-country-profiles";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import type { Country } from "@/types/country";

/** Start warming overview + landmarks as soon as the user touches a country entry point. */
export function warmCountryAiExplorer(country: Country): void {
  seedCachedCountryProfile(country);
  warmCountryProfileOnInteraction(country.name);
}

/** Push the AI Country Explorer deep-dive for a country (map sheet → stack). */
export function openCountryAiExplorer(country: Country): void {
  seedCachedCountryProfile(country);
  useRecentlyViewedStore.getState().recordView(country);

  const { countries, currentIndex } = useCountryFeedStore.getState();
  const neighbors = [countries[currentIndex - 1], countries[currentIndex + 1]];
  for (const neighbor of neighbors) {
    if (neighbor) void prefetchCountryProfile(neighbor.name);
  }

  void (async () => {
    const hasEnrichedCache = isCountryProfileEnriched(
      getCachedCountryProfile(country.name),
    );

    await ensureCountryProfileReady(country.name, {
      maxWaitMs: hasEnrichedCache ? 0 : 450,
    });

    router.push({
      pathname: "/country/[name]/ai-explorer",
      params: { name: country.name },
    });
  })();
}
