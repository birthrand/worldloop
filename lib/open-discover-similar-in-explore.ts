import { router } from "expo-router";

import { isContinent } from "@/constants/regions";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import { warmCountryHeroImage } from "@/lib/prefetch-feed-heroes";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

function reorderSimilarFeed(
  countries: Country[],
  sourceName: string,
): { countries: Country[]; currentIndex: number } {
  const similar = countries.filter((country) => country.name !== sourceName);
  if (similar.length === 0) {
    const index = countries.findIndex((country) => country.name === sourceName);
    return { countries, currentIndex: index >= 0 ? index : 0 };
  }

  const sourceMatches = countries.filter(
    (country) => country.name === sourceName,
  );
  return {
    countries: [...similar, ...sourceMatches],
    currentIndex: 0,
  };
}

/** Opens Explore on the same continent, starting on a country similar to the saved one. */
export async function openDiscoverSimilarInExplore(
  source: Country,
): Promise<void> {
  const region = source.region?.trim();

  if (!region || !isContinent(region)) {
    openCountryInExplore(source);
    return;
  }

  const feed = useCountryFeedStore.getState();
  await feed.setRegionFilter(region);

  const state = useCountryFeedStore.getState();
  if (state.status === "error" || state.countries.length === 0) {
    openCountryInExplore(source);
    return;
  }

  const { countries, currentIndex } = reorderSimilarFeed(
    state.countries,
    source.name,
  );
  const target = countries[currentIndex];
  if (target) {
    warmCountryHeroImage(target);
  }

  useCountryFeedStore.setState({
    countries,
    currentIndex,
    focusEpoch: state.focusEpoch + 1,
  });

  router.push("/(tabs)/explore");
}
