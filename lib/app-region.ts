/** App map/explore region ids (may differ from REST Countries `region`). */
export const NORTH_AMERICA = "North America" as const;
export const SOUTH_AMERICA = "South America" as const;

/** Fallback when cached payloads still use REST Countries `Americas` without subregion. */
const SOUTH_AMERICA_COUNTRY_NAMES = new Set([
  "Argentina",
  "Bolivia",
  "Brazil",
  "Chile",
  "Colombia",
  "Ecuador",
  "Falkland Islands",
  "French Guiana",
  "Guyana",
  "Paraguay",
  "Peru",
  "Suriname",
  "Uruguay",
  "Venezuela",
]);

/**
 * Maps REST Countries `region` (+ optional `subregion`) to app continent ids.
 * Central America and Caribbean roll into North America.
 */
export function normalizeAppRegion(
  region: string,
  subregion?: string | null,
  countryName?: string,
): string {
  if (region === NORTH_AMERICA || region === SOUTH_AMERICA) return region;
  if (region !== "Americas") return region;

  if (subregion === SOUTH_AMERICA) return SOUTH_AMERICA;
  if (
    subregion === NORTH_AMERICA ||
    subregion === "Central America" ||
    subregion === "Caribbean"
  ) {
    return NORTH_AMERICA;
  }

  if (countryName && SOUTH_AMERICA_COUNTRY_NAMES.has(countryName)) {
    return SOUTH_AMERICA;
  }

  return NORTH_AMERICA;
}

export function normalizeCountryRegion<
  T extends { name: string; region: string },
>(country: T, subregion?: string | null): T {
  return {
    ...country,
    region: normalizeAppRegion(country.region, subregion, country.name),
  };
}

export function normalizeCountriesRegions<
  T extends { name: string; region: string },
>(countries: T[]): T[] {
  return countries.map((c) => normalizeCountryRegion(c));
}

/** Whether a country belongs to an Explore continent tab (handles legacy `Americas`). */
export function countryMatchesExploreRegion(
  country: { name: string; region: string },
  targetRegion: string,
): boolean {
  return normalizeAppRegion(country.region, undefined, country.name) === targetRegion;
}

export function filterCountriesForExploreRegion<
  T extends { name: string; region: string },
>(countries: T[], region: string): T[] {
  return normalizeCountriesRegions(
    countries.filter((c) => countryMatchesExploreRegion(c, region)),
  );
}
