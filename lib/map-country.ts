import { cca3FromCca2 } from "@/lib/cca2-to-cca3";
import type { Country, MapCountry } from "@/types/country";

/** Extract ISO alpha-2 from a flagcdn URL when present. */
export function cca2FromFlagUrl(flag: string): string {
  const match = flag.match(/flagcdn\.com\/w\d+\/([a-z]{2})\.png/i);
  return match?.[1]?.toUpperCase() ?? "";
}

/** Resolve ISO alpha-3 from a flagcdn URL (via alpha-2 lookup). */
export function cca3FromFlagUrl(flag: string): string {
  return cca3FromCca2(cca2FromFlagUrl(flag));
}

/** Minimal `Country` for save / Explore when full detail is not loaded yet. */
export function mapCountryToCountry(
  map: MapCountry,
  detail?: Country | null,
): Country {
  // Merge detail + map so we never lose required fields like `population`.
  // Some backend payloads can be partial during async loading.
  const merged = detail ? { ...detail } : null;
  const fallbackPopulation = map.population;
  const safePopulation =
    merged && Number.isFinite(merged.population)
      ? merged.population
      : fallbackPopulation;

  return {
    name: merged?.name ?? map.name,
    capital: merged?.capital ?? map.capital,
    region: merged?.region ?? map.region,
    population: safePopulation,
    cca2: merged?.cca2 ?? cca2FromFlagUrl(map.flag),
    flag: merged?.flag ?? map.flag,
    latlng: merged?.latlng ?? map.latlng,
    languages: merged?.languages,
    images: merged?.images ?? (map.image ? [map.image] : undefined),
    ai: merged?.ai,
  };
}

export function isValidLatLng(
  latlng: [number, number] | undefined | null,
): latlng is [number, number] {
  if (!latlng || latlng.length < 2) return false;
  const [lat, lng] = latlng;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** react-native-maps only renders markers between ±85° latitude. */
const MAP_MARKER_MAX_LATITUDE = 85;

/**
 * Pin + camera position for Antarctica. REST Countries reports the south pole
 * ([-90, 0]), which is off the visible map and hides the flag marker.
 */
export const ANTARCTICA_DISPLAY_LATLNG: [number, number] = [-72, 20];

const DISPLAY_LATLNG_BY_NAME: Record<string, [number, number]> = {
  Antarctica: ANTARCTICA_DISPLAY_LATLNG,
};

/** WGS84 coordinate used for map pins and camera focus (may differ from API latlng). */
export function getMapDisplayLatLng(
  country: Pick<MapCountry | Country, "name" | "latlng">,
): [number, number] {
  const override = DISPLAY_LATLNG_BY_NAME[country.name];
  if (override) return override;

  // Never hand back an invalid coordinate: passing NaN/undefined to the native
  // MapView's animateToRegion crashes the app. Fall back to [0, 0] instead.
  if (!isValidLatLng(country.latlng)) return [0, 0];

  const [lat, lng] = country.latlng;
  if (lat < -MAP_MARKER_MAX_LATITUDE) return [-MAP_MARKER_MAX_LATITUDE, lng];
  if (lat > MAP_MARKER_MAX_LATITUDE) return [MAP_MARKER_MAX_LATITUDE, lng];
  return [lat, lng];
}

/** Build a map country from search/feed data when the map list has not loaded yet. */
export function countryToMapCountry(country: Country): MapCountry {
  return {
    name: country.name,
    capital: country.capital,
    region: country.region,
    population: country.population,
    flag: country.flag,
    latlng: country.latlng,
    image: country.images?.[0] ?? null,
  };
}
