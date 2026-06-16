import { buildPlacesBase } from "@/lib/flatten-landmarks-for-feed";
import {
  buildPlacesView,
  flattenPlacesBase,
  type PlacesBaseFeed,
} from "@/lib/places-feed-presentation";
import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

export { placesFeedCacheKey } from "@/lib/places-feed-presentation";

const placesBaseCache: Record<string, PlacesBaseFeed> = {};
const placesViewCache: Record<string, PlaceFeedItem[]> = {};

let activePlacesCacheKey: string | null = null;

export function hasPlacesBaseCache(cacheKey: string): boolean {
  return placesBaseCache[cacheKey] !== undefined;
}

export function invalidatePlacesView(cacheKey: string): void {
  delete placesViewCache[cacheKey];
}

/** Drop the active region's shuffled view when leaving landmarks mode. */
export function exitActivePlacesView(): void {
  if (!activePlacesCacheKey) return;

  invalidatePlacesView(activePlacesCacheKey);
  activePlacesCacheKey = null;
}

export function switchPlacesCacheKey(nextKey: string): void {
  if (activePlacesCacheKey && activePlacesCacheKey !== nextKey) {
    invalidatePlacesView(activePlacesCacheKey);
  }

  activePlacesCacheKey = nextKey;
}

export function clearPlacesFeedCaches(): void {
  for (const key of Object.keys(placesBaseCache)) {
    delete placesBaseCache[key];
  }
  for (const key of Object.keys(placesViewCache)) {
    delete placesViewCache[key];
  }
  activePlacesCacheKey = null;
}

/** O(1) when base is warm — builds a fresh session view without async flatten. */
export function tryBuildPlacesViewFromBase(
  cacheKey: string,
): PlaceFeedItem[] | null {
  const base = placesBaseCache[cacheKey];
  if (!base) return null;

  const total = base.withImage.length + base.withoutImage.length;
  if (total === 0) return [];

  const view = buildPlacesView(base);
  placesViewCache[cacheKey] = view;
  return view;
}

export async function resolvePlacesFeedForKey(
  cacheKey: string,
  countries: Country[],
): Promise<PlaceFeedItem[]> {
  switchPlacesCacheKey(cacheKey);

  const cachedView = placesViewCache[cacheKey];
  if (cachedView) return cachedView;

  const syncView = tryBuildPlacesViewFromBase(cacheKey);
  if (syncView !== null) return syncView;

  const base = await buildPlacesBase(countries);
  placesBaseCache[cacheKey] = base;

  const total = flattenPlacesBase(base).length;
  if (total === 0) return [];

  const view = buildPlacesView(base);
  placesViewCache[cacheKey] = view;
  return view;
}

/** Background warm — base only, no shuffle. */
export async function warmPlacesBaseCache(
  cacheKey: string,
  countries: Country[],
): Promise<void> {
  if (placesBaseCache[cacheKey] !== undefined) return;
  if (countries.length === 0) return;

  try {
    placesBaseCache[cacheKey] = await buildPlacesBase(countries);
  } catch {
    // Background prefetch — ignore failures.
  }
}
