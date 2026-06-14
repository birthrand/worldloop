import { router } from "expo-router";

import type { HeroMediaMode } from "@/components/explore/explore-swipe-card";
import { seedCachedCountryProfile } from "@/lib/country-profile-cache";
import {
  prefetchCountryProfile,
  warmCountryProfileOnInteraction,
} from "@/lib/prefetch-country-profiles";
import { warmCountryHeroImage } from "@/lib/prefetch-feed-heroes";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import type { Country } from "@/types/country";

export type CountryDetailOrigin = "explore" | "saved" | "search" | "profile";

type OpenCountryDetailOptions = {
  from: CountryDetailOrigin;
  heroIndex?: number;
  heroMediaMode?: HeroMediaMode;
};

/** Start warming hero + profile as soon as the user touches a country entry point. */
export function warmCountryDetail(country: Country): void {
  seedCachedCountryProfile(country);
  warmCountryHeroImage(country);
  warmCountryProfileOnInteraction(country.name);
}

function prefetchExploreNeighbors(): void {
  const { countries, currentIndex } = useCountryFeedStore.getState();
  const neighbors = [countries[currentIndex - 1], countries[currentIndex + 1]];
  for (const neighbor of neighbors) {
    if (neighbor) void prefetchCountryProfile(neighbor.name);
  }
}

/** Push the country detail stack screen for a country. */
export function openCountryDetail(
  country: Country,
  options: OpenCountryDetailOptions,
): void {
  seedCachedCountryProfile(country);
  useRecentlyViewedStore.getState().recordView(country);

  if (options.from === "explore") {
    prefetchExploreNeighbors();
  }

  if (options.from === "search") {
    useSearchUiStore.setState({ resumeSearchOnReturn: true });
  }

  router.push({
    pathname: "/country/[name]",
    params: {
      name: country.name,
      ...(options.from === "explore"
        ? {
            heroIndex: String(options.heroIndex ?? 0),
            ...(options.heroMediaMode === "video"
              ? { heroMediaMode: "video" }
              : {}),
          }
        : {}),
    },
  });
}
