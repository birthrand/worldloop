import { countryMatchesExploreRegion } from "../lib/app-region.js";
import { HttpError } from "../lib/http.js";
import type { Country, CountryBasic } from "../types/country.js";
import { enrichCountryWithAi } from "./ai.service.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";
import { getFeedCountries } from "./country.service.js";
import { enrichCountryWithImages } from "./image.service.js";

export type SearchResponse = {
  data: Country[];
  meta: {
    query: string | null;
    region: string | null;
    count: number;
  };
};

async function enrichCountry(country: CountryBasic): Promise<Country> {
  const withImages = await enrichCountryWithImages(country);
  return enrichCountryWithAi(withImages);
}

function filterCountries(
  countries: CountryBasic[],
  query: string,
  region: string,
): CountryBasic[] {
  let matches = countries;

  if (region) {
    matches = matches.filter((c) => countryMatchesExploreRegion(c, region));
  }

  if (query) {
    const queryLower = query.toLowerCase();
    matches = matches.filter((c) => c.name.toLowerCase().includes(queryLower));
  }

  return matches.sort((a, b) => a.name.localeCompare(b.name));
}

async function executeSearch(
  query: string,
  region: string,
): Promise<SearchResponse> {
  const allCountries = await getFeedCountries();
  const matches = filterCountries(allCountries, query, region);
  const data = await Promise.all(matches.map(enrichCountry));

  return {
    data,
    meta: {
      query: query || null,
      region: region || null,
      count: data.length,
    },
  };
}

/**
 * Search countries by partial name and/or region.
 * Requires at least one of `query` or `region`; both empty returns 400.
 */
export async function searchCountries(
  query?: string,
  region?: string,
): Promise<SearchResponse> {
  const normalizedQuery = query?.trim() ?? "";
  const normalizedRegion = region?.trim() ?? "";

  if (!normalizedQuery && !normalizedRegion) {
    throw new HttpError(
      "At least one of query or region is required",
      400,
      "INVALID_SEARCH",
    );
  }

  const cacheKey = cacheKeys.search(normalizedQuery, normalizedRegion);

  return getOrSet(cacheKey, CACHE_TTL.search, () =>
    executeSearch(normalizedQuery, normalizedRegion),
  );
}
