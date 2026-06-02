import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { fetchCountryByName } from "@/lib/api";
import { staleWhileRevalidate } from "@/lib/client-cache";
import type { MapCountry } from "@/types/country";

/** Top map countries by population — likely preview taps after map hydrate. */
const DEFAULT_PREFETCH_COUNT = 20;

let prefetchGeneration = 0;

function topCountriesByPopulation(
  countries: MapCountry[],
  max: number,
): MapCountry[] {
  return [...countries]
    .sort((a, b) => b.population - a.population)
    .slice(0, max);
}

/**
 * Background-warm country detail (AI + images) into AsyncStorage after map load.
 * Sequential, low priority — skips network when client cache is still fresh.
 */
export async function prefetchMapCountryDetails(
  countries: MapCountry[],
  options?: { max?: number },
): Promise<void> {
  if (countries.length === 0) return;

  const generation = ++prefetchGeneration;
  const max = options?.max ?? DEFAULT_PREFETCH_COUNT;
  const targets = topCountriesByPopulation(countries, max);

  if (__DEV__) {
    console.log("[prefetch-country-details]", {
      count: targets.length,
      names: targets.map((c) => c.name),
    });
  }

  for (const country of targets) {
    if (generation !== prefetchGeneration) return;

    try {
      await staleWhileRevalidate({
        key: CLIENT_CACHE_KEYS.countryDetail(country.name),
        ttlSeconds: CLIENT_CACHE_TTL.countryDetail,
        fetcher: () => fetchCountryByName(country.name),
      });
    } catch {
      // Background prefetch — ignore per-country failures.
    }
  }
}
