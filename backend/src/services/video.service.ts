import { env } from "../config/env.js";
import {
  extractVideoAssetId,
  parsePexelsVideoResults,
  parsePixabayVideoResults,
  pickBestVideoHit,
  pickFirstUnusedVideoHit,
  type PexelsVideoHit,
  type VideoOrientationPreference,
} from "../lib/upstream-validation.js";
import type { CountryBasic, CountryVideo } from "../types/country.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheGet, cacheKeys, cacheSet } from "./cache.service.js";
import { getImagesForCountry } from "./image.service.js";

const PEXELS_VIDEO_SEARCH = "https://api.pexels.com/videos/search";
const PIXABAY_VIDEO_SEARCH = "https://pixabay.com/api/videos/";
const PER_PAGE = 15;
const PEXELS_VIDEO_TIMEOUT_MS = 5_000;

let loggedMissingVideoKeys = false;

export type CountryWithVideos = CountryBasic & { videos: CountryVideo[] };

export type CountryVideoFetchContext = {
  name: string;
  capital?: string;
  subregion?: string;
  images?: string[];
};

const QUERY_SUFFIXES = ["culture", "travel", "landscape"] as const;
const ORIENTATION_PREFERENCE: VideoOrientationPreference[] = [
  "portrait",
  "landscape",
];

export { extractVideoAssetId };

async function searchPexelsVideos(
  query: string,
  orientation: VideoOrientationPreference,
  page = 1,
): Promise<PexelsVideoHit[]> {
  const url = new URL(PEXELS_VIDEO_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));
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

async function searchPixabayVideos(
  query: string,
  page = 1,
): Promise<PexelsVideoHit[]> {
  const url = new URL(PIXABAY_VIDEO_SEARCH);
  url.searchParams.set("key", env.pixabayApiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));
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
  usedAssetIds?: Set<string>,
): Promise<CountryVideo | null> {
  const hit =
    usedAssetIds && usedAssetIds.size > 0
      ? pickFirstUnusedVideoHit(hits, orientation, usedAssetIds)
      : pickBestVideoHit(hits, orientation);
  if (!hit) return null;

  const poster = await resolvePoster(countryName, hit, existingImages);
  return toCountryVideo(hit, provider, poster);
}

function buildVideoSearchQueries(context: CountryVideoFetchContext): string[] {
  const name = context.name.trim();
  const capital = context.capital?.trim();
  const subregion = context.subregion?.trim();
  const queries: string[] = [];

  if (capital) {
    queries.push(`${capital} city`);
    queries.push(`${capital} travel`);
  }

  for (const suffix of QUERY_SUFFIXES) {
    queries.push(`${name} ${suffix}`);
  }

  if (subregion) {
    queries.push(`${subregion} travel`);
  }

  return queries;
}

async function fetchFromPexels(
  query: string,
  existingImages?: string[],
  usedAssetIds?: Set<string>,
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
        usedAssetIds,
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
  usedAssetIds?: Set<string>,
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
        usedAssetIds,
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

const MAX_VIDEO_SEARCH_PAGES = 5;

async function fetchVideoForExactQuery(
  query: string,
  countryName: string,
  existingImages: string[] | undefined,
  usedAssetIds: Set<string>,
): Promise<CountryVideo | null> {
  for (let page = 1; page <= MAX_VIDEO_SEARCH_PAGES; page += 1) {
    for (const orientation of ORIENTATION_PREFERENCE) {
      if (env.pexelsApiKey) {
        const hits = await searchPexelsVideos(query, orientation, page);
        if (hits.length === 0 && page > 1) continue;

        const video = await buildVideoFromHits(
          hits,
          countryName,
          "pexels",
          orientation,
          existingImages,
          usedAssetIds,
        );
        if (video) return video;
      }

      if (env.pixabayApiKey) {
        const hits = await searchPixabayVideos(query, page);
        if (hits.length === 0 && page > 1) continue;

        const video = await buildVideoFromHits(
          hits,
          countryName,
          "pixabay",
          orientation,
          existingImages,
          usedAssetIds,
        );
        if (video) return video;
      }
    }
  }

  return null;
}

async function fetchVideoForQuery(
  query: string,
  existingImages: string[] | undefined,
  usedAssetIds: Set<string> | undefined,
): Promise<CountryVideo | null> {
  const pexelsVideo = await fetchFromPexels(
    query,
    existingImages,
    usedAssetIds,
  );
  if (pexelsVideo) return pexelsVideo;

  return fetchFromPixabay(query, existingImages, usedAssetIds);
}

async function fetchVideosFromApis(
  countryName: string,
  existingImages?: string[],
  usedAssetIds?: Set<string>,
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
  const video = await fetchVideoForQuery(query, existingImages, usedAssetIds);
  if (video) return [video];

  logger.debug("No video found for country", { country: query });
  return [];
}

/** Catalog repair — try richer queries and skip clips already assigned elsewhere. */
export async function fetchUniqueVideoForCountry(
  context: CountryVideoFetchContext,
  usedAssetIds: Set<string>,
): Promise<CountryVideo | null> {
  if (!env.pexelsApiKey && !env.pixabayApiKey) {
    return null;
  }

  const queries = buildVideoSearchQueries(context);

  for (const query of queries) {
    const video = await fetchVideoForExactQuery(
      query,
      context.name,
      context.images,
      usedAssetIds,
    );
    if (!video) continue;

    const assetId = extractVideoAssetId(video.url);
    if (usedAssetIds.has(assetId)) continue;

    return video;
  }

  return null;
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
