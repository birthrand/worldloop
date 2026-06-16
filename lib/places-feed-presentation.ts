import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

export type PlacesBaseFeed = {
  withImage: PlaceFeedItem[];
  withoutImage: PlaceFeedItem[];
};

function shuffleItems<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function sortPlaceFeedItems(items: PlaceFeedItem[]): PlaceFeedItem[] {
  return [...items].sort((a, b) => {
    const countryCmp = a.country.name.localeCompare(b.country.name);
    if (countryCmp !== 0) return countryCmp;

    const aKey = a.landmark.id?.trim() || a.landmark.name.trim();
    const bKey = b.landmark.id?.trim() || b.landmark.name.trim();
    return aKey.localeCompare(bKey);
  });
}

/** Stable cache key — continents by name; For You pool by sorted country names. */
export function placesFeedCacheKey(
  region: string | null,
  countries: Country[],
): string {
  if (region !== null) {
    return `region:${region}`;
  }

  const names = countries
    .map((country) => country.name.trim().toLowerCase())
    .filter(Boolean)
    .sort();

  return `pool:${names.join("|")}`;
}

/** Session presentation order — cheap shuffle over a cached base feed. */
export function buildPlacesView(base: PlacesBaseFeed): PlaceFeedItem[] {
  return [...shuffleItems(base.withImage), ...shuffleItems(base.withoutImage)];
}

export function flattenPlacesBase(base: PlacesBaseFeed): PlaceFeedItem[] {
  return [...base.withImage, ...base.withoutImage];
}
