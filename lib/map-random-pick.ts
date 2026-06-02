import { resolveFlatZoomTier } from "@/lib/map-camera-zoom";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import {
  filterMapCountriesByChip,
  type MapFilterChip,
  type MapMode,
} from "@/store/use-map-store";
import type { FeaturedShortcut } from "@/store/use-map-ui-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { MapCountry } from "@/types/country";

type BuildMapRandomPoolOptions = {
  countries: MapCountry[];
  activeChip: MapFilterChip;
  featuredShortcut: FeaturedShortcut | null;
  focusedRegion: string | null;
  useWorldPool: boolean;
};

/** Builds the country pool used by map random / next-country actions. */
export async function buildMapRandomPool({
  countries,
  activeChip,
  featuredShortcut,
  focusedRegion,
  useWorldPool,
}: BuildMapRandomPoolOptions): Promise<MapCountry[]> {
  if (countries.length === 0) return [];

  let pool: MapCountry[] = [];

  if (useWorldPool) {
    if (featuredShortcut === "all") {
      pool = countries;
    } else if (featuredShortcut === "terrain") {
      const feed = useCountryFeedStore.getState();
      if (feed.countries.length === 0 && feed.status === "idle") {
        await feed.loadInitialFeed();
      }
      const names = feed.countries.slice(0, 3).map((c) => c.name);
      pool = countries.filter((c) => names.includes(c.name));
    } else if (featuredShortcut === "saved") {
      const names = useSavedCountriesStore
        .getState()
        .savedCountries.map((c) => c.name);
      pool = countries.filter((c) => names.includes(c.name));
    }

    if (pool.length === 0) {
      pool = countries;
    }
  } else {
    const base = focusedRegion
      ? countries.filter((c) => c.region === focusedRegion)
      : countries;
    pool = base;
  }

  // Only keep countries we can actually frame on the map. Picking one with an
  // invalid coordinate would feed NaN to the native MapView and crash the app.
  const filtered = filterMapCountriesByChip(pool, activeChip).filter(
    (country) => isValidLatLng(getMapDisplayLatLng(country)),
  );

  if (filtered.length > 0) return filtered;

  return filterMapCountriesByChip(countries, activeChip).filter((country) =>
    isValidLatLng(getMapDisplayLatLng(country)),
  );
}

/**
 * Whether random/shuffle actions should draw from the full world pool.
 * Regional scope wins when a continent is active; preview shuffle never widens scope.
 */
export function resolveMapRandomUseWorldPool({
  focusedRegion,
  mapMode,
  flatLatitudeDelta,
  contextualOnly = false,
}: {
  focusedRegion: string | null;
  mapMode: MapMode;
  flatLatitudeDelta: number;
  contextualOnly?: boolean;
}): boolean {
  if (contextualOnly || focusedRegion) return false;
  return mapMode === "3d" || resolveFlatZoomTier(flatLatitudeDelta) === "world";
}

/** Picks a random country, optionally avoiding `excludeName` when the pool allows. */
export function pickRandomMapCountry(
  pool: MapCountry[],
  excludeName?: string | null,
): MapCountry | null {
  if (pool.length === 0) return null;

  const candidates =
    excludeName && pool.length > 1
      ? pool.filter((c) => c.name !== excludeName)
      : pool;

  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

/** Chance the FAB stays within the active continent when one is focused. */
export const FAB_CONTINENT_BIAS = 0.7;

/**
 * Picks from the global `pool` but biased toward `region` when one is active:
 * with probability `bias` it samples that continent (if it has members), otherwise
 * the whole pool. Always avoids `excludeName` when the chosen pool allows it, but
 * falls back to allow a repeat if the pool is too small/constrained to do otherwise.
 */
export function pickBiasedRandomMapCountry({
  pool,
  region,
  excludeName,
  bias = FAB_CONTINENT_BIAS,
}: {
  pool: MapCountry[];
  region: string | null;
  excludeName?: string | null;
  bias?: number;
}): MapCountry | null {
  if (pool.length === 0) return null;

  const regionPool = region ? pool.filter((c) => c.region === region) : [];
  const preferRegion = regionPool.length > 0 && Math.random() < bias;
  const primary = preferRegion ? regionPool : pool;

  return (
    // Prefer a fresh country in the chosen pool…
    pickRandomMapCountry(primary, excludeName) ??
    // …then anywhere in the global pool…
    pickRandomMapCountry(pool, excludeName) ??
    // …finally allow a repeat when the pool is constrained to one option.
    pickRandomMapCountry(pool)
  );
}
