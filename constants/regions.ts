/** Default Explore header tab — mixed paginated feed, no continent filter. */
export const FOR_YOU_TAB = "For You" as const;

/** REST Countries `region` values (continents) used for browse filters. */
export const CONTINENTS = [
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
] as const;

export type Continent = (typeof CONTINENTS)[number];

/** Explore top bar tabs: For You first, then continents. */
export const EXPLORE_HEADER_TABS = [FOR_YOU_TAB, ...CONTINENTS] as const;

export type ExploreHeaderTab = (typeof EXPLORE_HEADER_TABS)[number];

export function isContinent(value: string): value is Continent {
  return (CONTINENTS as readonly string[]).includes(value);
}
