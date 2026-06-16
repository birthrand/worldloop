import { countryMatchesExploreRegion } from "../lib/app-region.js";
import { rankCountrySearchMatch } from "../lib/country-name-aliases.js";
import { HttpError } from "../lib/http.js";
import { normalizeImageDisplayWidth } from "../lib/upstream-validation.js";
import type { Country, CountryBasic } from "../types/country.js";
import { enrichCountryWithAi } from "./ai.service.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";
import { getFeedCountries } from "./country.service.js";
import {
  enrichCountryWithImages,
  type ImageDisplayOptions,
} from "./image.service.js";
import { enrichCountryWithVideos } from "./video.service.js";

export type SearchResponse = {
  data: Country[];
  meta: {
    query: string | null;
    region: string | null;
    count: number;
  };
};

async function enrichCountry(
  country: CountryBasic,
  imageOptions: ImageDisplayOptions,
): Promise<Country> {
  const withImages = await enrichCountryWithImages(country, imageOptions);
  const withVideos = await enrichCountryWithVideos(withImages);
  return enrichCountryWithAi(withVideos);
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
    const queryLower = query.trim().toLowerCase();
    matches = matches
      .map((country) => ({
        country,
        rank: rankCountrySearchMatch(country.name, queryLower),
      }))
      .filter(
        (entry): entry is { country: CountryBasic; rank: number } =>
          entry.rank !== null,
      )
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.country.name.localeCompare(b.country.name);
      })
      .map((entry) => entry.country);
  } else {
    matches = matches.sort((a, b) => a.name.localeCompare(b.name));
  }

  return matches;
}

async function executeSearch(
  query: string,
  region: string,
  imageOptions: ImageDisplayOptions,
): Promise<SearchResponse> {
  const allCountries = await getFeedCountries();
  const matches = filterCountries(allCountries, query, region);
  const data = await Promise.all(
    matches.map((country) => enrichCountry(country, imageOptions)),
  );

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
  imageOptions: ImageDisplayOptions = {},
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

  const displayWidth = normalizeImageDisplayWidth(imageOptions.displayWidthPx);
  const cacheKey = cacheKeys.search(
    normalizedQuery,
    normalizedRegion,
    displayWidth,
  );

  return getOrSet(cacheKey, CACHE_TTL.search, () =>
    executeSearch(normalizedQuery, normalizedRegion, imageOptions),
  );
}
