import { env } from "../config/env.js";
import {
  parsePexelsVideoResults,
  pickBestPexelsVideoHit,
  type PexelsVideoHit,
} from "../lib/upstream-validation.js";
import type { CountryBasic, CountryVideo } from "../types/country.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";
import { getImagesForCountry } from "./image.service.js";

const PEXELS_VIDEO_SEARCH = "https://api.pexels.com/videos/search";
const PER_PAGE = 5;

let loggedMissingPexelsKey = false;

export type CountryWithVideos = CountryBasic & { videos: CountryVideo[] };

async function searchPexelsVideos(query: string): Promise<PexelsVideoHit[]> {
  const url = new URL(PEXELS_VIDEO_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url.toString(), {
    headers: { Authorization: env.pexelsApiKey },
  });

  if (!response.ok) {
    logger.warn("Pexels Video API error", {
      status: response.status,
      country: query,
    });
    return [];
  }

  try {
    const data = await response.json();
    return parsePexelsVideoResults(data);
  } catch (error) {
    logger.warn("Pexels Video API parse failed", {
      country: query,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

async function resolvePoster(
  countryName: string,
  hit: PexelsVideoHit,
  existingImages?: string[],
): Promise<string | undefined> {
  if (hit.poster) return hit.poster;

  const images =
    existingImages && existingImages.length > 0
      ? existingImages
      : await getImagesForCountry(countryName);

  return images[0];
}

function toCountryVideo(hit: PexelsVideoHit, poster?: string): CountryVideo {
  const video: CountryVideo = {
    url: hit.url,
    provider: "pexels",
  };

  if (poster) video.poster = poster;
  if (hit.duration !== undefined) video.duration = hit.duration;

  return video;
}

async function fetchVideosFromApis(
  countryName: string,
  existingImages?: string[],
): Promise<CountryVideo[]> {
  if (!env.pexelsApiKey) {
    if (!loggedMissingPexelsKey) {
      logger.debug("PEXELS_API_KEY not set — skipping video fetch");
      loggedMissingPexelsKey = true;
    }
    return [];
  }

  const query = countryName.trim();
  const querySuffixes = ["culture", "landscape", "travel"] as const;
  let hits: PexelsVideoHit[] = [];

  for (const suffix of querySuffixes) {
    hits = await searchPexelsVideos(`${query} ${suffix}`);
    if (hits.length > 0) break;
  }

  if (hits.length === 0) {
    logger.debug("No video found for country", { country: query });
    return [];
  }

  const hit = pickBestPexelsVideoHit(hits);
  if (!hit) {
    logger.debug("No video found for country", { country: query });
    return [];
  }

  const poster = await resolvePoster(query, hit, existingImages);
  const video = toCountryVideo(hit, poster);

  logger.debug("Video fetched from Pexels", {
    country: query,
    duration: video.duration,
    width: hit.width,
    candidates: hits.length,
  });

  return [video];
}

export async function getVideosForCountry(
  countryName: string,
  existingImages?: string[],
): Promise<CountryVideo[]> {
  const key = cacheKeys.videos(countryName);

  return getOrSet(key, CACHE_TTL.videos, () =>
    fetchVideosFromApis(countryName, existingImages),
  );
}

export async function enrichCountryWithVideos<
  T extends CountryBasic & { images?: string[] },
>(country: T): Promise<T & { videos: CountryVideo[] }> {
  const videos = await getVideosForCountry(country.name, country.images);
  return { ...country, videos };
}

export async function enrichCountriesWithVideos<
  T extends CountryBasic & { images?: string[] },
>(countries: T[]): Promise<(T & { videos: CountryVideo[] })[]> {
  return Promise.all(countries.map(enrichCountryWithVideos));
}
