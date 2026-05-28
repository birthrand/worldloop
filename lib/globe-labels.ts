import {
  CONTINENTS,
  continentDisplayLabel,
  type Continent,
} from "@/constants/regions";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import type { MapCluster } from "@/lib/map-clusters";
import type { MapCountry } from "@/types/country";

export type LabelType = "continent" | "selected-country";

export type GlobeLabel = {
  id: string;
  type: LabelType;
  text: string;
  lat: number;
  lng: number;
};

export type GlobeLabelScreenPosition = {
  id: string;
  type: LabelType;
  x: number;
  y: number;
  visible: boolean;
};

/**
 * Fixed visual anchors so continent labels stay stable and always render,
 * even before country data / clusters are available.
 */
const CONTINENT_LABEL_ANCHORS: Record<Continent, [number, number]> = {
  Africa: [4, 22],
  Americas: [-12, -62],
  Antarctic: [-78, 25],
  Asia: [34, 95],
  Europe: [54, 15],
  Oceania: [-22, 140],
};

export function buildContinentLabels(clusters?: MapCluster[]): GlobeLabel[] {
  const centerByRegion = new Map(
    (clusters ?? []).map((cluster) => [cluster.region, cluster.center]),
  );

  return CONTINENTS.map((region) => {
    const anchor = centerByRegion.get(region) ?? CONTINENT_LABEL_ANCHORS[region];
    return {
      id: `continent:${region}`,
      type: "continent" as const,
      text: continentDisplayLabel(region),
      lat: anchor[0],
      lng: anchor[1],
    };
  });
}

export function buildSelectedCountryLabel(
  country: MapCountry | null | undefined,
): GlobeLabel | null {
  if (!country || !isValidLatLng(country.latlng)) return null;

  const [lat, lng] = getMapDisplayLatLng(country);
  return {
    id: `selected-country:${country.name}`,
    type: "selected-country",
    text: country.name,
    lat,
    lng,
  };
}

/** Rule-based visible label set: all continents + optional selected country. */
export function buildGlobeVisibleLabels(params: {
  clusters?: MapCluster[];
  selectedCountry: MapCountry | null | undefined;
}): GlobeLabel[] {
  const continents = buildContinentLabels(params.clusters);
  const selected = buildSelectedCountryLabel(params.selectedCountry);
  return selected ? [...continents, selected] : continents;
}

export function globeLabelPositionsChanged(
  prev: GlobeLabelScreenPosition[],
  next: GlobeLabelScreenPosition[],
): boolean {
  if (prev.length !== next.length) return true;

  return prev.some((position, index) => {
    const candidate = next[index];
    if (!candidate) return true;

    return (
      position.id !== candidate.id ||
      position.type !== candidate.type ||
      position.x !== candidate.x ||
      position.y !== candidate.y ||
      position.visible !== candidate.visible
    );
  });
}
