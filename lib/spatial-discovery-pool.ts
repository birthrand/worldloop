import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";
import type { GeoEntity, ZoomTier } from "@/types/geo";

type MapFilterChip = "all" | "population" | "culture" | "nature" | "history";

function filterMapCountriesByChip(
  countries: MapCountry[],
  chip: MapFilterChip,
): MapCountry[] {
  if (chip !== "population") return countries;

  const sorted = [...countries].sort((a, b) => b.population - a.population);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.2));
  const topNames = new Set(
    sorted.slice(0, topCount).map((country) => country.name),
  );
  return countries.filter((country) => topNames.has(country.name));
}

function mapViewportEntitiesToCountries(
  viewportCountries: GeoEntity[],
  allCountries: MapCountry[],
): MapCountry[] {
  const byName = new Map(
    allCountries.map((country) => [country.name, country]),
  );
  const pool: MapCountry[] = [];

  for (const entity of viewportCountries) {
    const country = byName.get(entity.name);
    if (country) pool.push(country);
  }

  return pool;
}

function filterPoolPreferUnvisited(
  pool: MapCountry[],
  visitedNames?: Set<string>,
  preferUnvisited?: boolean,
): MapCountry[] {
  if (!preferUnvisited || !visitedNames || visitedNames.size === 0) {
    return pool;
  }

  const unvisited = pool.filter((country) => !visitedNames.has(country.name));
  return unvisited.length > 0 ? unvisited : pool;
}

/** Builds the spatial discovery pool for FAB / preview shuffle. */
export function buildSpatialDiscoveryPool(input: {
  viewportCountries: GeoEntity[];
  focusedRegion: string | null;
  allCountries: MapCountry[];
  tier: ZoomTier;
  visitedNames?: Set<string>;
  preferUnvisited?: boolean;
}): MapCountry[] {
  const {
    viewportCountries,
    focusedRegion,
    allCountries,
    tier,
    visitedNames,
    preferUnvisited,
  } = input;

  if (allCountries.length === 0) return [];

  let pool: MapCountry[];

  if (viewportCountries.length > 0 && tier !== "world") {
    pool = mapViewportEntitiesToCountries(viewportCountries, allCountries);
  } else if (focusedRegion) {
    pool = allCountries.filter((country) => country.region === focusedRegion);
  } else {
    pool = allCountries;
  }

  if (pool.length === 0 && focusedRegion) {
    pool = allCountries.filter((country) => country.region === focusedRegion);
  }

  return filterPoolPreferUnvisited(pool, visitedNames, preferUnvisited);
}

type BuildSpatialMapRandomPoolOptions = {
  countries: MapCountry[];
  activeChip: MapFilterChip;
  viewportCountries: GeoEntity[];
  focusedRegion: string | null;
  tier: ZoomTier;
  visitedNames?: Set<string>;
  preferUnvisited?: boolean;
};

/** Spatial pool with chip + coordinate guards (same fallbacks as buildMapRandomPool). */
export function buildSpatialMapRandomPool({
  countries,
  activeChip,
  viewportCountries,
  focusedRegion,
  tier,
  visitedNames,
  preferUnvisited,
}: BuildSpatialMapRandomPoolOptions): MapCountry[] {
  const base = buildSpatialDiscoveryPool({
    viewportCountries,
    focusedRegion,
    allCountries: countries,
    tier,
    visitedNames,
    preferUnvisited,
  });

  const filtered = filterMapCountriesByChip(base, activeChip).filter(
    (country) => isValidLatLng(getMapDisplayLatLng(country)),
  );

  if (filtered.length > 0) return filtered;

  return filterMapCountriesByChip(countries, activeChip).filter((country) =>
    isValidLatLng(getMapDisplayLatLng(country)),
  );
}

/** True when FAB/shuffle should prefer the viewport/region pool over featured shortcuts. */
export function shouldUseSpatialDiscoveryPool(input: {
  viewportCountries: GeoEntity[];
  tier: ZoomTier;
  focusedRegion: string | null;
}): boolean {
  if (input.viewportCountries.length > 0 && input.tier !== "world") {
    return true;
  }

  return input.focusedRegion !== null;
}
