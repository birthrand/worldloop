import { env } from "../config/env.js";
import {
  parsePexelsVideoResults,
  parsePixabayVideoResults,
  pickBestVideoHit,
  type PexelsVideoHit,
  type VideoOrientationPreference,
} from "../lib/upstream-validation.js";
import type { CountryBasic, CountryVideo } from "../types/country.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheGet, cacheKeys, cacheSet } from "./cache.service.js";
import { getImagesForCountry } from "./image.service.js";

const PEXELS_VIDEO_SEARCH = "https://api.pexels.com/videos/search";
const PIXABAY_VIDEO_SEARCH = "https://pixabay.com/api/videos/";
const PER_PAGE = 5;
const PEXELS_VIDEO_TIMEOUT_MS = 5_000;

let loggedMissingVideoKeys = false;

export type CountryWithVideos = CountryBasic & { videos: CountryVideo[] };

const QUERY_SUFFIXES = ["culture", "travel", "landscape"] as const;
const ORIENTATION_PREFERENCE: VideoOrientationPreference[] = [
  "portrait",
  "landscape",
];

async function searchPexelsVideos(
  query: string,
  orientation: VideoOrientationPreference,
): Promise<PexelsVideoHit[]> {
  const url = new URL(PEXELS_VIDEO_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("orientation", orientation);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PEXELS_VIDEO_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: { Authorization: env.pexelsApiKey },
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn("Pexels Video API error", {
        status: response.status,
        country: query,
        orientation,
      });
      return [];
    }

    const data = await response.json();
    return parsePexelsVideoResults(data);
  } catch (error) {
    logger.warn("Pexels Video API request failed", {
      country: query,
      orientation,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function searchPixabayVideos(query: string): Promise<PexelsVideoHit[]> {
  const url = new URL(PIXABAY_VIDEO_SEARCH);
  url.searchParams.set("key", env.pixabayApiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("video_type", "film");
  url.searchParams.set("safesearch", "true");

  const response = await fetch(url.toString());

  if (!response.ok) {
    logger.warn("Pixabay Video API error", {
      status: response.status,
      country: query,
    });
    return [];
  }

  try {
    const data = await response.json();
    return parsePixabayVideoResults(data);
  } catch (error) {
    logger.warn("Pixabay Video API parse failed", {
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

function toCountryVideo(
  hit: PexelsVideoHit,
  provider: CountryVideo["provider"],
  poster?: string,
): CountryVideo {
  const video: CountryVideo = {
    url: hit.url,
    provider,
  };

  if (poster) video.poster = poster;
  if (hit.duration !== undefined) video.duration = hit.duration;

  return video;
}

async function buildVideoFromHits(
  hits: PexelsVideoHit[],
  countryName: string,
  provider: NonNullable<CountryVideo["provider"]>,
  orientation: VideoOrientationPreference,
  existingImages?: string[],
): Promise<CountryVideo | null> {
  const hit = pickBestVideoHit(hits, orientation);
  if (!hit) return null;

  const poster = await resolvePoster(countryName, hit, existingImages);
  return toCountryVideo(hit, provider, poster);
}

async function fetchFromPexels(
  query: string,
  existingImages?: string[],
): Promise<CountryVideo | null> {
  if (!env.pexelsApiKey) return null;

  for (const orientation of ORIENTATION_PREFERENCE) {
    for (const suffix of QUERY_SUFFIXES) {
      const hits = await searchPexelsVideos(`${query} ${suffix}`, orientation);
      const video = await buildVideoFromHits(
        hits,
        query,
        "pexels",
        orientation,
        existingImages,
      );
      if (video) {
        logger.debug("Video fetched from Pexels", {
          country: query,
          orientation,
          duration: video.duration,
          candidates: hits.length,
        });
        return video;
      }
    }
  }

  return null;
}

async function fetchFromPixabay(
  query: string,
  existingImages?: string[],
): Promise<CountryVideo | null> {
  if (!env.pixabayApiKey) return null;

  for (const orientation of ORIENTATION_PREFERENCE) {
    for (const suffix of QUERY_SUFFIXES) {
      const hits = await searchPixabayVideos(`${query} ${suffix}`);
      const video = await buildVideoFromHits(
        hits,
        query,
        "pixabay",
        orientation,
        existingImages,
      );
      if (video) {
        logger.debug("Video fetched from Pixabay", {
          country: query,
          orientation,
          duration: video.duration,
          candidates: hits.length,
        });
        return video;
      }
    }
  }

  return null;
}

async function fetchVideosFromApis(
  countryName: string,
  existingImages?: string[],
): Promise<CountryVideo[]> {
  if (!env.pexelsApiKey && !env.pixabayApiKey) {
    if (!loggedMissingVideoKeys) {
      logger.debug(
        "PEXELS_API_KEY and PIXABAY_API_KEY not set — skipping video fetch",
      );
      loggedMissingVideoKeys = true;
    }
    return [];
  }

  const query = countryName.trim();

  const pexelsVideo = await fetchFromPexels(query, existingImages);
  if (pexelsVideo) return [pexelsVideo];

  const pixabayVideo = await fetchFromPixabay(query, existingImages);
  if (pixabayVideo) return [pixabayVideo];

  logger.debug("No video found for country", { country: query });
  return [];
}

export async function getVideosForCountry(
  countryName: string,
  existingImages?: string[],
): Promise<CountryVideo[]> {
  const key = cacheKeys.videos(countryName);
  const cached = await cacheGet<CountryVideo[]>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetchVideosFromApis(countryName, existingImages);
  const ttl = fresh.length > 0 ? CACHE_TTL.videos : CACHE_TTL.short;
  await cacheSet(key, fresh, ttl);
  return fresh;
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
