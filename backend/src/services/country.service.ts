import { HttpError } from "../lib/http.js";
import {
  fetchAllRestCountries,
  fetchRestCountryByName,
} from "../lib/rest-countries.js";
import type { CountryBasic } from "../types/country.js";
import { CACHE_TTL, cacheGet, cacheKeys, getOrSet } from "./cache.service.js";

/** Fisher–Yates shuffle; mutates a copy so feed order stays stable while cached. */
function shuffleCountries<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function findCountryInBasics(
  countries: CountryBasic[] | null | undefined,
  name: string,
): CountryBasic | null {
  const query = name.trim().toLowerCase();
  if (!query || !countries?.length) {
    return null;
  }

  return (
    countries.find((country) => country.name.toLowerCase() === query) ?? null
  );
}

export async function getCountryByName(name: string): Promise<CountryBasic> {
  const key = cacheKeys.country(name);

  return getOrSet(key, CACHE_TTL.country, async () => {
    // Reuse the warmed feed list when available — saves REST Countries quota.
    const cachedBasics = await cacheGet<CountryBasic[]>(
      cacheKeys.feedCountries("basics"),
    );
    const fromFeed = findCountryInBasics(cachedBasics, name);
    if (fromFeed) {
      return fromFeed;
    }

    return fetchRestCountryByName(name);
  });
}

export async function getAllCountryBasics(): Promise<CountryBasic[]> {
  const key = cacheKeys.feedCountries("basics");

  return getOrSet(key, CACHE_TTL.feed, () => fetchAllRestCountries());
}

export async function getFeedCountries(): Promise<CountryBasic[]> {
  const key = cacheKeys.feedCountries("all");

  return getOrSet(key, CACHE_TTL.feed, async () => {
    const countries = await getAllCountryBasics();
    if (countries.length === 0) {
      throw new HttpError(
        "Invalid response from REST Countries API",
        502,
        "UPSTREAM_INVALID",
      );
    }
    return shuffleCountries(countries);
  });
}
