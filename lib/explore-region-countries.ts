import {
  filterCountriesForExploreRegion,
  isSplitAmericasRegion,
} from "@/lib/app-region";
import {
  getStaticExploreRegionCountries,
  isStaticCountryCatalogEnabled,
} from "@/lib/static-countries";
import type { Country } from "@/types/country";

const FEED_PAGE_LIMIT = 30;
const MAX_FEED_PAGES = 15;

async function fetchAllFeedCountriesFromApi(): Promise<Country[]> {
  const { fetchFeedCountries } = await import("@/lib/api");
  const all: Country[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_FEED_PAGES; page += 1) {
    const batch = await fetchFeedCountries(cursor, FEED_PAGE_LIMIT);
    all.push(...batch.data);
    if (!batch.nextCursor) break;
    cursor = batch.nextCursor;
  }

  return all;
}

/**
 * Loads countries for an Explore continent tab.
 * Resolves North/South America from legacy `Americas` payloads when needed.
 */
export async function fetchExploreRegionCountries(
  region: string,
): Promise<Country[]> {
  if (isStaticCountryCatalogEnabled()) {
    return getStaticExploreRegionCountries(region);
  }

  const { fetchSearchCountries } = await import("@/lib/api");
  const primary = await fetchSearchCountries(undefined, region);
  let countries = filterCountriesForExploreRegion(primary.data, region);
  if (countries.length > 0) return countries;

  if (isSplitAmericasRegion(region)) {
    const americas = await fetchSearchCountries(undefined, "Americas");
    countries = filterCountriesForExploreRegion(americas.data, region);
    if (countries.length > 0) return countries;

    const allFeed = await fetchAllFeedCountriesFromApi();
    countries = filterCountriesForExploreRegion(allFeed, region);
  }

  return countries;
}
