import { STATIC_COUNTRY_CATALOG_ENABLED } from "@/constants/static-catalog";
import catalogJson from "@/data/countries.json";

import {
  filterCountriesForExploreRegion,
  normalizeCountriesRegions,
} from "@/lib/app-region";
import { countryToMapCountry } from "@/lib/map-country";
import type { Country, MapCountry } from "@/types/country";
import type { StaticCountryCatalog } from "@/types/country-catalog";

const catalog = catalogJson as StaticCountryCatalog;

let normalizedCountries: Country[] | null = null;
let countriesByName: Map<string, Country> | null = null;
let shuffledFeedOrder: Country[] | null = null;

function shuffleInPlace<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function normalizeCountryEntry(country: Country): Country {
  return {
    ...country,
    cca2: country.cca2.trim().toUpperCase(),
  };
}

function ensureCatalogLoaded(): void {
  if (normalizedCountries && countriesByName) return;

  normalizedCountries = normalizeCountriesRegions(
    catalog.countries.map(normalizeCountryEntry),
  );
  countriesByName = new Map(
    normalizedCountries.map((country) => [
      country.name.trim().toLowerCase(),
      country,
    ]),
  );
}

export function isStaticCountryCatalogEnabled(): boolean {
  return STATIC_COUNTRY_CATALOG_ENABLED && catalog.countries.length > 0;
}

export function getStaticCatalogCount(): number {
  return catalog.count;
}

/** Full normalized catalog (alphabetical by name in source JSON). */
export function getStaticCountries(): Country[] {
  ensureCatalogLoaded();
  return normalizedCountries ?? [];
}

export function getStaticCountryByName(name: string): Country | null {
  ensureCatalogLoaded();
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return countriesByName?.get(key) ?? null;
}

export function getStaticMapCountries(): MapCountry[] {
  return getStaticCountries().map(countryToMapCountry);
}

export function getStaticExploreRegionCountries(region: string): Country[] {
  return filterCountriesForExploreRegion(getStaticCountries(), region);
}

export function resetStaticFeedShuffle(): void {
  shuffledFeedOrder = null;
}

function getShuffledFeedOrder(): Country[] {
  if (!shuffledFeedOrder) {
    shuffledFeedOrder = shuffleInPlace(getStaticCountries());
  }
  return shuffledFeedOrder;
}

export type StaticFeedPage = {
  countries: Country[];
  nextCursor: string | null;
};

/** Paginated For You feed — cursor is numeric offset into session shuffle. */
export function getStaticFeedPage(cursor?: string, limit = 20): StaticFeedPage {
  const order = getShuffledFeedOrder();
  const offset = cursor ? Number.parseInt(cursor, 10) : 0;
  const safeOffset = Number.isFinite(offset) && offset > 0 ? offset : 0;
  const page = order.slice(safeOffset, safeOffset + limit);
  const nextOffset = safeOffset + page.length;
  const nextCursor = nextOffset < order.length ? String(nextOffset) : null;

  return { countries: page, nextCursor };
}

function rankNameMatch(name: string, query: string): number | null {
  const normalizedName = name.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  if (normalizedName.startsWith(q)) return 0;
  if (q.length >= 3 && normalizedName.includes(q)) return 1;
  return null;
}

/** In-memory search — name prefix/substring + capital match. */
export function searchStaticCountries(
  query?: string,
  region?: string,
): Country[] {
  const q = query?.trim() ?? "";
  const r = region?.trim() ?? "";

  let matches = getStaticCountries();

  if (r) {
    matches = filterCountriesForExploreRegion(matches, r);
  }

  if (!q) {
    return [...matches].sort((a, b) => a.name.localeCompare(b.name));
  }

  const ql = q.toLowerCase();

  return matches
    .map((country) => {
      const nameRank = rankNameMatch(country.name, q);
      if (nameRank !== null) {
        return { country, rank: nameRank };
      }

      const capital = country.capital.trim().toLowerCase();
      if (capital.startsWith(ql)) {
        return { country, rank: 2 };
      }
      if (ql.length >= 3 && capital.includes(ql)) {
        return { country, rank: 3 };
      }

      return null;
    })
    .filter(
      (entry): entry is { country: Country; rank: number } => entry !== null,
    )
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.country.name.localeCompare(b.country.name);
    })
    .map((entry) => entry.country);
}

/** Resolve viewport entities to catalog rows (preserves entities with no match). */
export function resolveStaticCountriesByNames(names: string[]): Country[] {
  const result: Country[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const country = getStaticCountryByName(name);
    if (!country) continue;
    const key = country.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(country);
  }

  return result;
}
