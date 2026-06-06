import { CENTROID_FALLBACK_PADDING_DEGREES } from "@/constants/geo";
import {
  cca2FromFlagUrl,
  getMapDisplayLatLng,
  isValidLatLng,
} from "@/lib/map-country";
import {
  bboxFromBoundaryPolygon,
  countryNamesMatch,
  getCountryBoundaryPolygons,
  mergeBBoxes,
} from "@/lib/map-country-boundaries";
import type { MapCountry } from "@/types/country";
import type { BBox, GeoEntity } from "@/types/geo";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const countriesGeoJson = require("@/assets/geo/ne_50m_admin_0_countries/ne_50m_admin_0_countries.json");

let cachedIndex: GeoEntity[] | null = null;
let cachedSourceKey: string | null = null;

function countryEntityId(country: MapCountry): string {
  const cca2 = cca2FromFlagUrl(country.flag);
  if (cca2) return cca2.toLowerCase();
  return country.name.trim().toLowerCase().replace(/\s+/g, "-");
}

function bboxFromCentroid(
  lat: number,
  lng: number,
  paddingDegrees: number,
): BBox {
  return {
    west: lng - paddingDegrees,
    east: lng + paddingDegrees,
    south: lat - paddingDegrees,
    north: lat + paddingDegrees,
  };
}

function buildSourceKey(countries: MapCountry[]): string {
  if (countries.length === 0) return "empty";
  return countries.map(countryEntityId).join(",");
}

function resolveCountryBbox(
  country: MapCountry,
  polygons: ReturnType<typeof getCountryBoundaryPolygons>,
): BBox | null {
  let merged: BBox | null = null;

  for (const polygon of polygons) {
    if (!countryNamesMatch(country.name, polygon.countryName)) continue;

    const polygonBbox = bboxFromBoundaryPolygon(polygon);
    if (!polygonBbox) continue;

    merged = merged ? mergeBBoxes(merged, polygonBbox) : polygonBbox;
  }

  return merged;
}

export function buildGeoIndex(countries: MapCountry[]): GeoEntity[] {
  const polygons = getCountryBoundaryPolygons(countriesGeoJson);
  const entities: GeoEntity[] = [];

  for (const country of countries) {
    if (!isValidLatLng(country.latlng)) continue;

    const [lat, lng] = getMapDisplayLatLng(country);
    let bbox = resolveCountryBbox(country, polygons);

    if (!bbox) {
      if (__DEV__) {
        console.warn(
          `[geo-index] no Natural Earth match for "${country.name}" — centroid padding fallback`,
        );
      }
      bbox = bboxFromCentroid(lat, lng, CENTROID_FALLBACK_PADDING_DEGREES);
    }

    entities.push({
      kind: "country",
      id: countryEntityId(country),
      name: country.name,
      cca2: cca2FromFlagUrl(country.flag),
      region: country.region,
      centroid: [lat, lng],
      bbox,
    });
  }

  return entities;
}

export function getGeoIndex(): GeoEntity[] | null {
  return cachedIndex;
}

export function ensureGeoIndex(countries: MapCountry[]): GeoEntity[] {
  const sourceKey = buildSourceKey(countries);
  if (cachedIndex && cachedSourceKey === sourceKey) {
    return cachedIndex;
  }

  cachedIndex = buildGeoIndex(countries);
  cachedSourceKey = sourceKey;
  return cachedIndex;
}
