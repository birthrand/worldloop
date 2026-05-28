/** Default Explore header tab — mixed paginated feed, no continent filter. */
export const FOR_YOU_TAB = "For You" as const;

/** REST Countries `region` values (continents) used for browse filters. */
export const CONTINENTS = [
  "Africa",
  "Americas",
  "Antarctic",
  "Asia",
  "Europe",
  "Oceania",
] as const;

export type Continent = (typeof CONTINENTS)[number];

/** User-facing labels where REST Countries naming differs (e.g. `Antarctic` → Antarctica). */
export const CONTINENT_DISPLAY_LABELS: Record<Continent, string> = {
  Africa: "Africa",
  Americas: "Americas",
  Antarctic: "Antarctica",
  Asia: "Asia",
  Europe: "Europe",
  Oceania: "Oceania",
};

/** Explore top bar tabs: For You first, then continents. */
export const EXPLORE_HEADER_TABS = [FOR_YOU_TAB, ...CONTINENTS] as const;

export type ExploreHeaderTab = (typeof EXPLORE_HEADER_TABS)[number];

export function isContinent(value: string): value is Continent {
  return (CONTINENTS as readonly string[]).includes(value);
}

export function continentDisplayLabel(region: string): string {
  if (isContinent(region)) return CONTINENT_DISPLAY_LABELS[region];
  return region;
}

/** Step to previous/next continent in a list (wraps around). */
export function adjacentContinent(
  current: string,
  direction: "prev" | "next",
  ordered: readonly string[] = CONTINENTS,
): string | null {
  if (ordered.length === 0) return null;

  const idx = ordered.indexOf(current);
  if (idx < 0) return ordered[0] ?? null;

  const delta = direction === "next" ? 1 : -1;
  const nextIdx = (idx + delta + ordered.length) % ordered.length;
  return ordered[nextIdx] ?? null;
}
