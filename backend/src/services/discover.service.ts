import { countryMatchesExploreRegion } from "../lib/app-region.js";
import {
  bboxCenter,
  countryIntersectsBBox,
  rankCountriesByCenter,
  type BBox,
  type GeoIndexedCountry,
} from "../lib/geo-bbox.js";
import type { CountryBasic } from "../types/country.js";
import type { DiscoverQuery, DiscoverResponse } from "../types/discover.js";
import type { MapCountry } from "../types/map.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";
import { getFeedCountries } from "./country.service.js";
import { getImagesForCountry } from "./image.service.js";

/** Centroid ± degrees when no precomputed bbox asset exists (temporary v1 fallback). */
const CENTROID_FALLBACK_PADDING_DEGREES = 2;

let cachedGeoIndex: GeoIndexedCountry[] | null = null;

function wrapLongitude(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function bboxFromCentroid(
  lat: number,
  lng: number,
  paddingDegrees: number,
): BBox {
  return {
    west: wrapLongitude(lng - paddingDegrees),
    east: wrapLongitude(lng + paddingDegrees),
    south: Math.max(-90, lat - paddingDegrees),
    north: Math.min(90, lat + paddingDegrees),
  };
}

function toGeoIndexedCountry(country: CountryBasic): GeoIndexedCountry {
  const [lat, lng] = country.latlng;

  return {
    name: country.name,
    capital: country.capital,
    region: country.region,
    population: country.population,
    cca2: country.cca2,
    flag: country.flag,
    centroid: [lat, lng],
    bbox: bboxFromCentroid(lat, lng, CENTROID_FALLBACK_PADDING_DEGREES),
  };
}

async function ensureServerGeoIndex(): Promise<GeoIndexedCountry[]> {
  if (cachedGeoIndex) return cachedGeoIndex;

  const countries = await getFeedCountries();
  cachedGeoIndex = countries.map(toGeoIndexedCountry);
  return cachedGeoIndex;
}

async function toMapCountry(entity: GeoIndexedCountry): Promise<MapCountry> {
  const images = await getImagesForCountry(entity.name);

  return {
    name: entity.name,
    capital: entity.capital,
    region: entity.region,
    population: entity.population,
    flag: entity.flag,
    latlng: entity.centroid,
    image: images[0] ?? null,
  };
}

async function buildDiscoverResponse(
  query: DiscoverQuery,
): Promise<DiscoverResponse> {
  const index = await ensureServerGeoIndex();
  const queryBBox: BBox = {
    west: query.west,
    south: query.south,
    east: query.east,
    north: query.north,
  };

  let matches = index.filter((entity) =>
    countryIntersectsBBox(entity, queryBBox),
  );

  if (query.region) {
    matches = matches.filter((entity) =>
      countryMatchesExploreRegion(entity, query.region!),
    );
  }

  const center = {
    lat: query.centerLat,
    lng: query.centerLng,
  };
  const ranked = rankCountriesByCenter(matches, center);
  const totalCount = ranked.length;

  const page = ranked.slice(query.cursor, query.cursor + query.limit);
  const data = await Promise.all(page.map(toMapCountry));

  const nextOffset = query.cursor + query.limit;
  const nextCursor = nextOffset < totalCount ? String(nextOffset) : null;

  return {
    data,
    meta: {
      count: totalCount,
      bbox: queryBBox,
      region: query.region,
      nextCursor,
    },
  };
}

export async function discoverCountries(
  params: Omit<DiscoverQuery, "centerLat" | "centerLng"> & {
    centerLat?: number;
    centerLng?: number;
  },
): Promise<DiscoverResponse> {
  const queryBBox: BBox = {
    west: params.west,
    south: params.south,
    east: params.east,
    north: params.north,
  };

  const defaultCenter = bboxCenter(queryBBox);
  const query: DiscoverQuery = {
    west: params.west,
    south: params.south,
    east: params.east,
    north: params.north,
    centerLat: params.centerLat ?? defaultCenter.lat,
    centerLng: params.centerLng ?? defaultCenter.lng,
    region: params.region,
    limit: params.limit,
    cursor: params.cursor,
  };

  const cacheKey = cacheKeys.discover({
    west: query.west,
    south: query.south,
    east: query.east,
    north: query.north,
    centerLat: query.centerLat,
    centerLng: query.centerLng,
    region: query.region,
    limit: query.limit,
    cursor: query.cursor,
  });

  return getOrSet(cacheKey, CACHE_TTL.discover, () =>
    buildDiscoverResponse(query),
  );
}
