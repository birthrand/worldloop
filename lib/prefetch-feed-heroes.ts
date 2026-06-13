import { prefetchCountryImage } from "@/components/explore/country-image";
import { getCountryImages } from "@/lib/format-country";
import type { Country } from "@/types/country";

/** Legacy list bootstrap — first N cards before the deck mounts. */
const FEED_HERO_PREFETCH_COUNT = 2;

/** Rolling window: current card through +3 ahead (hero image only, not mounted). */
export const FEED_HERO_PREFETCH_AHEAD = 3;
/** Optional warm for back-swipe; hero-only, no extra card mount. */
export const FEED_HERO_PREFETCH_BEHIND = 1;

function countryHeroUri(country: Country | undefined): string | undefined {
  if (!country) return undefined;
  return getCountryImages(country)[0];
}

function collectHeroUrisAroundIndex(
  countries: Country[],
  aroundIndex: number,
  ahead = FEED_HERO_PREFETCH_AHEAD,
  behind = FEED_HERO_PREFETCH_BEHIND,
): string[] {
  if (countries.length === 0) return [];

  const clampedIndex = Math.max(0, Math.min(aroundIndex, countries.length - 1));
  const start = Math.max(0, clampedIndex - behind);
  const end = Math.min(countries.length - 1, clampedIndex + ahead);
  const seen = new Set<string>();
  const uris: string[] = [];

  for (let index = start; index <= end; index += 1) {
    const uri = countryHeroUri(countries[index]);
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    uris.push(uri);
  }

  return uris;
}

/** First N feed cards — prefetch heroes before swapping lists to avoid navy flash. */
export async function prefetchFeedHeroImages(
  countries: Country[],
): Promise<void> {
  const heroes = countries
    .slice(0, FEED_HERO_PREFETCH_COUNT)
    .map((country) => countryHeroUri(country))
    .filter((uri): uri is string => Boolean(uri));

  await Promise.all(heroes.map((uri) => prefetchCountryImage(uri)));
}

/** Hero-only rolling prefetch around the active swipe index. */
export async function prefetchFeedHeroImagesAroundIndex(
  countries: Country[],
  aroundIndex: number,
): Promise<void> {
  const uris = collectHeroUrisAroundIndex(countries, aroundIndex);
  await Promise.all(uris.map((uri) => prefetchCountryImage(uri)));
}

/** Swipe intent detected — prioritize the immediate next hero, then the window. */
export function warmFeedHeroesOnSwipeBegin(
  countries: Country[],
  currentIndex: number,
): void {
  const nextUri = countryHeroUri(countries[currentIndex + 1]);
  if (nextUri) {
    void prefetchCountryImage(nextUri);
  }

  void prefetchFeedHeroImagesAroundIndex(countries, currentIndex + 1);
}

/**
 * Direct navigation (search, home CTA) — warm one hero before Explore mounts.
 * Cheaper and more deterministic than a rolling window for a known target.
 */
export function warmCountryHeroImage(country: Country): void {
  const hero = countryHeroUri(country);
  if (hero) {
    void prefetchCountryImage(hero);
  }
}
