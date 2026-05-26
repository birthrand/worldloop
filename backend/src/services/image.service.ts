import { env } from "../config/env.js";
import type { CountryBasic } from "../types/country.js";
import { logger } from "../utils/logger.js";
import {
  CACHE_TTL,
  cacheKeys,
  getOrSet,
} from "./cache.service.js";

/**
 * Static placeholder URLs when Unsplash/Pexels are unavailable or fail.
 * These are public Unsplash CDN links (no API key required).
 */
const FALLBACK_IMAGES: readonly string[] = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
];

const MAX_IMAGES = 5;

type UnsplashSearchResponse = {
  results?: { urls?: { regular?: string } }[];
};

type PexelsSearchResponse = {
  photos?: { src?: { large?: string } }[];
};

export type CountryWithImages = CountryBasic & { images: string[] };

function getFallbackImages(): string[] {
  return [...FALLBACK_IMAGES];
}

async function fetchFromUnsplash(query: string): Promise<string[]> {
  if (!env.unsplashAccessKey) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", `${query} travel landscape`);
  url.searchParams.set("per_page", String(MAX_IMAGES));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${env.unsplashAccessKey}` },
  });

  if (!response.ok) {
    logger.warn("Unsplash API error", {
      query,
      status: response.status,
    });
    return [];
  }

  const data = (await response.json()) as UnsplashSearchResponse;
  return (data.results ?? [])
    .map((item) => item.urls?.regular)
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_IMAGES);
}

async function fetchFromPexels(query: string): Promise<string[]> {
  if (!env.pexelsApiKey) return [];

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", `${query} travel landscape`);
  url.searchParams.set("per_page", String(MAX_IMAGES));

  const response = await fetch(url.toString(), {
    headers: { Authorization: env.pexelsApiKey },
  });

  if (!response.ok) {
    logger.warn("Pexels API error", {
      query,
      status: response.status,
    });
    return [];
  }

  const data = (await response.json()) as PexelsSearchResponse;
  return (data.photos ?? [])
    .map((photo) => photo.src?.large)
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_IMAGES);
}

async function fetchImagesFromApis(countryName: string): Promise<string[]> {
  const query = countryName.trim();

  try {
    const unsplashUrls = await fetchFromUnsplash(query);
    if (unsplashUrls.length > 0) {
      logger.debug("Images fetched from Unsplash", {
        country: query,
        count: unsplashUrls.length,
      });
      return unsplashUrls;
    }

    const pexelsUrls = await fetchFromPexels(query);
    if (pexelsUrls.length > 0) {
      logger.debug("Images fetched from Pexels", {
        country: query,
        count: pexelsUrls.length,
      });
      return pexelsUrls;
    }
  } catch (error) {
    logger.warn("Image fetch failed", {
      country: query,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!env.unsplashAccessKey && !env.pexelsApiKey) {
    logger.debug("No image API keys configured — using placeholders", {
      country: query,
    });
  }

  return getFallbackImages();
}

export async function getImagesForCountry(countryName: string): Promise<string[]> {
  const key = cacheKeys.images(countryName);

  return getOrSet(key, CACHE_TTL.images, () =>
    fetchImagesFromApis(countryName),
  );
}

export async function enrichCountryWithImages(
  country: CountryBasic,
): Promise<CountryWithImages> {
  const images = await getImagesForCountry(country.name);
  return { ...country, images };
}

export async function enrichCountriesWithImages(
  countries: CountryBasic[],
): Promise<CountryWithImages[]> {
  return Promise.all(countries.map(enrichCountryWithImages));
}
