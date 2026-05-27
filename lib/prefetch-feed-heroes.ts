import { prefetchCountryImage } from "@/components/explore/country-image";
import { getCountryImages } from "@/lib/format-country";
import type { Country } from "@/types/country";

/** First N feed cards — prefetch heroes before swapping lists to avoid navy flash. */
const FEED_HERO_PREFETCH_COUNT = 2;

export async function prefetchFeedHeroImages(
  countries: Country[],
): Promise<void> {
  const heroes = countries
    .slice(0, FEED_HERO_PREFETCH_COUNT)
    .map((country) => getCountryImages(country)[0])
    .filter((uri): uri is string => Boolean(uri));

  await Promise.all(heroes.map((uri) => prefetchCountryImage(uri)));
}
