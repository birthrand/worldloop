import type { Country, MapCountry } from "@/types/country";

/** Extract ISO alpha-2 from a flagcdn URL when present. */
export function cca2FromFlagUrl(flag: string): string {
  const match = flag.match(/flagcdn\.com\/w\d+\/([a-z]{2})\.png/i);
  return match?.[1]?.toUpperCase() ?? "";
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
