/** Default Explore header tab — mixed paginated feed, no continent filter. */
export const FOR_YOU_TAB = "For You" as const;

/** Viewport-driven feed from the Map tab — not a continent filter. */
export const HERE_TAB = "Here" as const;

/** Bookmarked countries from the Saved tab — swipe deck of saved items. */
export const SAVED_TAB = "Saved" as const;

/** Landmark discovery — flattened places from the For You country pool. */
export const PLACES_TAB = "Places" as const;

/** REST Countries `region` values (continents) used for browse filters. */
export const CONTINENTS = [
  "Africa",
  "North America",
  "South America",
  "Antarctic",
  "Asia",
  "Europe",
  "Oceania",
] as const;

export type Continent = (typeof CONTINENTS)[number];

/** User-facing labels where REST Countries naming differs (e.g. `Antarctic` → Antarctica). */
export const CONTINENT_DISPLAY_LABELS: Record<Continent, string> = {
  Africa: "Africa",
  "North America": "North America",
  "South America": "South America",
  Antarctic: "Antarctica",
  Asia: "Asia",
  Europe: "Europe",
  Oceania: "Oceania",
};

/** Compact header labels — selected tab uses full `CONTINENT_DISPLAY_LABELS`. */
export const CONTINENT_SHORT_LABELS: Record<Continent, string> = {
  Africa: "Africa",
  "North America": "North America",
  "South America": "South America",
  Antarctic: "Antarctica",
  Asia: "Asia",
  Europe: "Europe",
  Oceania: "Oceania",
};

/** Explore top bar tabs: For You first, then continents. */
export const EXPLORE_HEADER_TABS = [FOR_YOU_TAB, ...CONTINENTS] as const;

export type ExploreHeaderTab =
  | (typeof EXPLORE_HEADER_TABS)[number]
  | typeof HERE_TAB
  | typeof SAVED_TAB
  | typeof PLACES_TAB;

export function isContinent(value: string): value is Continent {
  return (CONTINENTS as readonly string[]).includes(value);
}

export function continentDisplayLabel(region: string): string {
  if (isContinent(region)) return CONTINENT_DISPLAY_LABELS[region];
  return region;
}

export function continentTabLabel(region: string, expanded: boolean): string {
  if (!isContinent(region)) return region;
  return expanded
    ? CONTINENT_DISPLAY_LABELS[region]
    : CONTINENT_SHORT_LABELS[region];
}

/**
 * Step to previous/next continent in a list (wraps around).
 * Explore region-complete empty state uses the fixed global `CONTINENTS` order
 * (not header tab order or user progress).
 */
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
