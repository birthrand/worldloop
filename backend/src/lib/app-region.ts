export const NORTH_AMERICA = "North America";
export const SOUTH_AMERICA = "South America";

/** Fallback when legacy cache entries lack subregion. */
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

/** Maps REST Countries Americas (+ subregion) to North or South America. */
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

/** Whether a country belongs to an app continent tab (handles legacy `Americas`). */
export function countryMatchesExploreRegion(
  country: { name: string; region: string },
  targetRegion: string,
): boolean {
  return (
    normalizeAppRegion(country.region, undefined, country.name) === targetRegion
  );
}
