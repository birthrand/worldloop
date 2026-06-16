import type { CountryBasic } from "../types/country.js";
import type { MapCountriesResponse, MapCountry } from "../types/map.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";
import { getFeedCountries } from "./country.service.js";
import {
  getImagesForCountry,
  MAP_THUMBNAIL_DISPLAY_WIDTH,
} from "./image.service.js";

async function toMapCountry(country: CountryBasic): Promise<MapCountry> {
  const images = await getImagesForCountry(country.name, {
    displayWidthPx: MAP_THUMBNAIL_DISPLAY_WIDTH,
  });

  return {
    name: country.name,
    capital: country.capital,
    region: country.region,
    population: country.population,
    flag: country.flag,
    latlng: country.latlng,
    image: images[0] ?? null,
    languages: country.languages,
  };
}

async function buildMapCountries(): Promise<MapCountriesResponse> {
  const countries = await getFeedCountries();
  const data = await Promise.all(countries.map(toMapCountry));

  return { data };
}

/** All countries with valid coordinates, optimized for the map screen. */
export async function getMapCountries(): Promise<MapCountriesResponse> {
  return getOrSet(
    cacheKeys.mapCountries(MAP_THUMBNAIL_DISPLAY_WIDTH),
    CACHE_TTL.map,
    buildMapCountries,
  );
}
