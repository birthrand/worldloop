import { CONTINENTS } from "@/constants/regions";
import { getClusterActivity } from "@/constants/map-activity";
import { isValidLatLng } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

export type MapCluster = {
  id: string;
  region: string;
  center: [number, number];
  countryCount: number;
  activity: ReturnType<typeof getClusterActivity>;
};

function weightedCenter(countries: MapCountry[]): [number, number] {
  let totalWeight = 0;
  let sumLat = 0;
  let sumLng = 0;

  for (const c of countries) {
    if (!isValidLatLng(c.latlng)) continue;
    const [lat, lng] = c.latlng;
    const w = Number.isFinite(c.population) && c.population > 0 ? c.population : 1;
    totalWeight += w;
    sumLat += lat * w;
    sumLng += lng * w;
  }

  if (totalWeight <= 0) {
    const first = countries[0];
    return first ? [first.latlng[0], first.latlng[1]] : [0, 0];
  }

  return [sumLat / totalWeight, sumLng / totalWeight];
}

export function buildMapClusters(countries: MapCountry[]): MapCluster[] {
  const byRegion = new Map<string, MapCountry[]>();
  for (const c of countries) {
    const arr = byRegion.get(c.region) ?? [];
    arr.push(c);
    byRegion.set(c.region, arr);
  }

  // Preserve a stable order so the map feels consistent.
  const orderedRegions = CONTINENTS.filter((r) => byRegion.has(r));

  return orderedRegions.map((region) => {
    const clusterCountries = byRegion.get(region) ?? [];
    const center = weightedCenter(clusterCountries);
    const activity = getClusterActivity(clusterCountries);

    return {
      id: `cluster:${region}`,
      region,
      center,
      countryCount: clusterCountries.length,
      activity,
    };
  });
}

