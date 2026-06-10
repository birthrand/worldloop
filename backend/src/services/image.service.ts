import { env } from "../config/env.js";
import {
  normalizeImageDisplayWidth,
  parsePexelsImageHits,
  parseUnsplashImageHits,
  prioritizeImageHits,
  resolveImageHitForDisplayWidth,
  type ImageHit,
  type ImageOrientationPreference,
  type ImageSizeVariant,
} from "../lib/upstream-validation.js";
import type { CountryBasic } from "../types/country.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";

const MAX_IMAGES = 5;
const WIKIPEDIA_THUMB_WIDTH = 800;

/** Map markers and discover pins — smaller than full-screen Explore heroes. */
export const MAP_THUMBNAIL_DISPLAY_WIDTH = 640;

export type ImageDisplayOptions = {
  displayWidthPx?: number;
};
const IMAGE_SEARCH_PER_PAGE = 15;
const IMAGE_QUERY_SUFFIX = "travel";
const IMAGE_ORIENTATION_PREFERENCE: ImageOrientationPreference[] = [
  "portrait",
  "landscape",
];
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_USER_AGENT =
  "WorldLoop/1.0 (country image service; learning project)";

type WikipediaOpenSearchResponse = [string, string[], string[], string[]];

type WikipediaPageImagesQueryResponse = {
  query?: {
    pages?: Record<string, { images?: { title: string }[] }>;
  };
};

type WikipediaImageInfoQueryResponse = {
  query?: {
    pages?: Record<
      string,
      { imageinfo?: { thumburl?: string; url?: string }[] }
    >;
  };
};

type WikipediaSummaryResponse = {
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

export type CountryWithImages = CountryBasic & { images: string[] };

function wikiHeaders(): HeadersInit {
  return { "User-Agent": WIKIPEDIA_USER_AGENT };
}

function normalizeImageUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;

  if (value.startsWith("//")) {
    value = `https:${value}`;
  }

  if (/^https?:[^/]/i.test(value)) {
    value = value.replace(/^(https?):/i, "$1://");
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    url.protocol = "https:";
    if (url.hostname.toLowerCase() === "upload.wikipedia.org") {
      url.hostname = "upload.wikimedia.org";
    }
    return url.href;
  } catch {
    return null;
  }
}

function normalizeImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    const normalized = normalizeImageUrl(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function isUsefulWikipediaFile(filename: string): boolean {
  const name = filename.toLowerCase();
  if (!/\.(jpe?g|png|webp)$/.test(name)) return false;
  if (
    /icon|logo|wikimedia|ambox|edit-|question_book|commons-logo|symbol|puzzle/.test(
      name,
    )
  ) {
    return false;
  }
  return true;
}

function normalizeImageVariant(
  variant: ImageSizeVariant,
): ImageSizeVariant | null {
  const normalized = normalizeImageUrl(variant.url);
  if (!normalized) return null;
  return { ...variant, url: normalized };
}

function normalizeImageHits(hits: ImageHit[]): ImageHit[] {
  const seen = new Set<string>();
  const result: ImageHit[] = [];

  for (const hit of hits) {
    const variants = (hit.variants ?? [])
      .map((variant) => normalizeImageVariant(variant))
      .filter((variant): variant is ImageSizeVariant => variant !== null);

    const primaryUrl = normalizeImageUrl(hit.url) ?? variants[0]?.url ?? null;
    if (!primaryUrl || seen.has(primaryUrl)) continue;

    seen.add(primaryUrl);
    result.push({
      ...hit,
      url: primaryUrl,
      variants: variants.length > 0 ? variants : undefined,
    });
  }

  return result;
}

function hitsToDisplayUrls(hits: ImageHit[], displayWidthPx: number): string[] {
  return hits
    .map((hit) => resolveImageHitForDisplayWidth(hit, displayWidthPx).url)
    .filter((url): url is string => Boolean(url));
}

function toWikipediaImageHit(
  url: string,
  width = WIKIPEDIA_THUMB_WIDTH,
): ImageHit {
  return {
    url,
    width,
    variants: [{ url, width }],
  };
}

async function searchProviderImages(
  provider: "unsplash" | "pexels",
  query: string,
  orientation: ImageOrientationPreference,
): Promise<ImageHit[]> {
  if (provider === "unsplash") {
    return searchUnsplashImages(query, orientation);
  }
  return searchPexelsImages(query, orientation);
}

async function fetchPortraitFirstImages(
  provider: "unsplash" | "pexels",
  query: string,
): Promise<ImageHit[]> {
  const hits: ImageHit[] = [];

  for (const orientation of IMAGE_ORIENTATION_PREFERENCE) {
    const batch = await searchProviderImages(provider, query, orientation);
    hits.push(...batch);
    if (hits.length >= MAX_IMAGES) break;
  }

  return prioritizeImageHits(normalizeImageHits(hits)).slice(0, MAX_IMAGES);
}

async function searchUnsplashImages(
  query: string,
  orientation: ImageOrientationPreference,
): Promise<ImageHit[]> {
  if (!env.unsplashAccessKey) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", `${query} ${IMAGE_QUERY_SUFFIX}`);
  url.searchParams.set("per_page", String(IMAGE_SEARCH_PER_PAGE));
  url.searchParams.set("orientation", orientation);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${env.unsplashAccessKey}` },
  });

  if (!response.ok) {
    logger.warn("Unsplash API error", {
      query,
      orientation,
      status: response.status,
    });
    return [];
  }

  const data = await response.json();
  return normalizeImageHits(parseUnsplashImageHits(data));
}

async function searchPexelsImages(
  query: string,
  orientation: ImageOrientationPreference,
): Promise<ImageHit[]> {
  if (!env.pexelsApiKey) return [];

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", `${query} ${IMAGE_QUERY_SUFFIX}`);
  url.searchParams.set("per_page", String(IMAGE_SEARCH_PER_PAGE));
  url.searchParams.set("orientation", orientation);

  const response = await fetch(url.toString(), {
    headers: { Authorization: env.pexelsApiKey },
  });

  if (!response.ok) {
    logger.warn("Pexels API error", {
      query,
      orientation,
      status: response.status,
    });
    return [];
  }

  const data = await response.json();
  return normalizeImageHits(parsePexelsImageHits(data));
}

async function fetchFromUnsplash(query: string): Promise<ImageHit[]> {
  return fetchPortraitFirstImages("unsplash", query);
}

async function fetchFromPexels(query: string): Promise<ImageHit[]> {
  return fetchPortraitFirstImages("pexels", query);
}

async function resolveWikipediaPageTitle(
  query: string,
): Promise<string | null> {
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "opensearch");
  url.searchParams.set("search", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("namespace", "0");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) {
    logger.warn("Wikipedia opensearch error", {
      query,
      status: response.status,
    });
    return null;
  }

  const data = (await response.json()) as WikipediaOpenSearchResponse;
  const title = data[1]?.[0];
  return title ?? null;
}

async function fetchWikipediaSummaryImages(title: string): Promise<string[]> {
  const slug = encodeURIComponent(title.replace(/ /g, "_"));
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
    { headers: wikiHeaders() },
  );

  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaSummaryResponse;
  const urls: string[] = [];

  if (data.thumbnail?.source) urls.push(data.thumbnail.source);
  if (
    data.originalimage?.source &&
    data.originalimage.source !== data.thumbnail?.source
  ) {
    urls.push(data.originalimage.source);
  }

  return normalizeImageUrls(urls);
}

async function fetchWikipediaPageImageFiles(title: string): Promise<string[]> {
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "images");
  url.searchParams.set("imlimit", "30");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaPageImagesQueryResponse;
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page?.images) return [];

  return page.images.map((img) => img.title).filter(isUsefulWikipediaFile);
}

async function resolveWikipediaImageUrls(files: string[]): Promise<string[]> {
  if (files.length === 0) return [];

  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", files.join("|"));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url");
  url.searchParams.set("iiurlwidth", "800");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaImageInfoQueryResponse;
  const pages = data.query?.pages ?? {};

  return normalizeImageUrls(
    Object.values(pages)
      .flatMap((page) => page.imageinfo ?? [])
      .map((info) => info.thumburl ?? info.url)
      .filter((url): url is string => Boolean(url)),
  );
}

async function fetchFromWikipedia(query: string): Promise<ImageHit[]> {
  const title = await resolveWikipediaPageTitle(query);
  if (!title) return [];

  const hits: ImageHit[] = [];
  const seen = new Set<string>();

  const pushUrl = (url: string, width = WIKIPEDIA_THUMB_WIDTH) => {
    const normalized = normalizeImageUrl(url);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    hits.push(toWikipediaImageHit(normalized, width));
  };

  for (const url of await fetchWikipediaSummaryImages(title)) {
    pushUrl(url);
  }

  if (hits.length < MAX_IMAGES) {
    const files = await fetchWikipediaPageImageFiles(title);
    const fileUrls = await resolveWikipediaImageUrls(
      files.slice(0, MAX_IMAGES * 2),
    );

    for (const url of fileUrls) {
      pushUrl(url);
      if (hits.length >= MAX_IMAGES) break;
    }
  }

  return hits.slice(0, MAX_IMAGES);
}

async function fetchImageHitsFromApis(
  countryName: string,
): Promise<ImageHit[]> {
  const query = countryName.trim();

  const unsplashHits = await fetchFromUnsplash(query);
  if (unsplashHits.length > 0) {
    logger.debug("Images fetched from Unsplash", {
      country: query,
      count: unsplashHits.length,
    });
    return unsplashHits;
  }

  const pexelsHits = await fetchFromPexels(query);
  if (pexelsHits.length > 0) {
    logger.debug("Images fetched from Pexels", {
      country: query,
      count: pexelsHits.length,
    });
    return pexelsHits;
  }

  try {
    const wikipediaHits = await fetchFromWikipedia(query);
    if (wikipediaHits.length > 0) {
      logger.debug("Images fetched from Wikipedia", {
        country: query,
        count: wikipediaHits.length,
      });
      return wikipediaHits;
    }
  } catch (error) {
    logger.warn("Wikipedia image fetch failed", {
      country: query,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.debug("No images found for country", { country: query });
  return [];
}

export async function getImagesForCountry(
  countryName: string,
  options?: ImageDisplayOptions,
): Promise<string[]> {
  const displayWidthPx = normalizeImageDisplayWidth(options?.displayWidthPx);
  const key = cacheKeys.images(countryName);

  const cachedHits = await getOrSet(key, CACHE_TTL.images, () =>
    fetchImageHitsFromApis(countryName),
  );

  return hitsToDisplayUrls(cachedHits, displayWidthPx);
}

export async function enrichCountryWithImages(
  country: CountryBasic,
  options?: ImageDisplayOptions,
): Promise<CountryWithImages> {
  const images = await getImagesForCountry(country.name, options);
  return { ...country, images };
}

export async function enrichCountriesWithImages(
  countries: CountryBasic[],
  options?: ImageDisplayOptions,
): Promise<CountryWithImages[]> {
  return Promise.all(
    countries.map((country) => enrichCountryWithImages(country, options)),
  );
}
