import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import {
  fetchDiscoverCountries,
  type DiscoverCountriesResponse,
} from "@/lib/api";
import { staleWhileRevalidate } from "@/lib/client-cache";
import { ensureGeoIndex } from "@/lib/geo-index";
import type { MapCountry } from "@/types/country";
import type { BBox, GeoEntity, ZoomTier } from "@/types/geo";

export type DiscoverViewportParams = {
  bbox: BBox;
  viewportCenter: { lat: number; lng: number };
  focusedRegion: string | null;
  tier: ZoomTier;
  mapCountries: MapCountry[];
  limit?: number;
};

function resolveDiscoverRequestRegion(
  focusedRegion: string | null,
  tier: ZoomTier,
): string | undefined {
  return focusedRegion && tier === "continent" ? focusedRegion : undefined;
}

function buildDiscoverCacheKey(params: DiscoverViewportParams): string {
  const { bbox, focusedRegion, viewportCenter, tier, limit = 50 } = params;
  const effectiveRegion = resolveDiscoverRequestRegion(focusedRegion, tier);
  const regionPart = effectiveRegion?.trim().toLowerCase() ?? "all";
  const bboxPart = [
    bbox.west.toFixed(4),
    bbox.south.toFixed(4),
    bbox.east.toFixed(4),
    bbox.north.toFixed(4),
  ].join(":");
  const centerPart = [
    viewportCenter.lat.toFixed(4),
    viewportCenter.lng.toFixed(4),
  ].join(":");

  return CLIENT_CACHE_KEYS.discover(
    `${bboxPart}:${centerPart}:${regionPart}:${limit}`,
  );
}

export function mapCountryNamesToGeoEntities(
  names: string[],
  mapCountries: MapCountry[],
): GeoEntity[] {
  const index = ensureGeoIndex(mapCountries);
  const byName = new Map(index.map((entity) => [entity.name, entity]));

  const ordered: GeoEntity[] = [];
  for (const name of names) {
    const entity = byName.get(name);
    if (entity) ordered.push(entity);
  }

  return ordered;
}

export async function fetchDiscoverViewportCountries(
  params: DiscoverViewportParams,
  onCached?: (entities: GeoEntity[]) => void,
): Promise<GeoEntity[]> {
  const { bbox, viewportCenter, focusedRegion, tier, mapCountries } = params;
  const limit = params.limit ?? 50;

  const region = resolveDiscoverRequestRegion(focusedRegion, tier);

  const request = {
    west: bbox.west,
    south: bbox.south,
    east: bbox.east,
    north: bbox.north,
    centerLat: viewportCenter.lat,
    centerLng: viewportCenter.lng,
    region,
    limit,
  };

  const cacheKey = buildDiscoverCacheKey(params);

  const toEntities = (response: DiscoverCountriesResponse) =>
    mapCountryNamesToGeoEntities(
      response.data.map((country) => country.name),
      mapCountries,
    );

  const response = await staleWhileRevalidate<DiscoverCountriesResponse>({
    key: cacheKey,
    ttlSeconds: CLIENT_CACHE_TTL.discover,
    fetcher: () => fetchDiscoverCountries(request),
    onCached: (cached) => {
      const entities = toEntities(cached);
      if (entities.length > 0) onCached?.(entities);
    },
  });

  return toEntities(response);
}
