import { filterMapCountriesByChip, type MapFilterChip } from "@/store/use-map-store";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { FeaturedShortcut } from "@/store/use-map-ui-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
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
    if (featuredShortcut === "forYou") {
      useRecentlyViewedStore.getState().seedIfEmpty();
      const names = useRecentlyViewedStore
        .getState()
        .entries.slice(0, 3)
        .map((e) => e.country.name);
      pool = countries.filter((c) => names.includes(c.name));
    } else if (featuredShortcut === "newActivity") {
      const feed = useCountryFeedStore.getState();
      if (feed.countries.length === 0 && feed.status === "idle") {
        await feed.loadInitialFeed();
      }
      const names = feed.countries.slice(0, 3).map((c) => c.name);
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
  return filterMapCountriesByChip(pool, activeChip).filter((country) =>
    isValidLatLng(getMapDisplayLatLng(country)),
  );
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
