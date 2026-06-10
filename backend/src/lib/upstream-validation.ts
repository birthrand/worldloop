import type { RawNewsArticle } from "../types/news.js";
import { HttpError } from "./http.js";

export function assertJsonArray<T>(
  data: unknown,
  label = "external data service",
): T[] {
  if (!Array.isArray(data)) {
    throw new HttpError(
      `Invalid response from ${label}`,
      502,
      "UPSTREAM_INVALID",
    );
  }

  return data as T[];
}

export function assertNonEmptyArray<T>(
  items: T[],
  label = "external data service",
): T[] {
  if (items.length === 0) {
    throw new HttpError(
      `Invalid response from ${label}`,
      502,
      "UPSTREAM_INVALID",
    );
  }

  return items;
}

type UnsplashSearchResponse = {
  results?: unknown;
};

type PexelsSearchResponse = {
  photos?: unknown;
};

type PexelsVideoSearchResponse = {
  videos?: unknown;
};

type PexelsVideoFileCandidate = {
  link?: unknown;
  file_type?: unknown;
  width?: unknown;
  height?: unknown;
};

type PexelsVideoCandidate = {
  image?: unknown;
  duration?: unknown;
  video_files?: unknown;
};

export type PexelsVideoHit = {
  url: string;
  poster?: string;
  duration?: number;
  /** Selected MP4 width in pixels (used to rank clips). */
  width?: number;
  /** Selected MP4 height in pixels (used for portrait vs landscape). */
  height?: number;
};

export type VideoOrientationPreference = "portrait" | "landscape";

export type ImageSizeVariant = {
  url: string;
  width: number;
};

export type ImageHit = {
  url: string;
  width?: number;
  height?: number;
  /** Provider-native renditions — pick a DPR-appropriate URL at serve time. */
  variants?: ImageSizeVariant[];
};

export type ImageOrientationPreference = "portrait" | "landscape";

/** Cap hero downloads — mirrors video service upper bound. */
export const PREFERRED_MAX_IMAGE_WIDTH = 1920;
export const DEFAULT_IMAGE_DISPLAY_WIDTH = 1080;
export const MIN_IMAGE_DISPLAY_WIDTH = 400;
export const MAX_IMAGE_DISPLAY_WIDTH = 1920;

const UNSPLASH_VARIANT_WIDTHS = {
  regular: 1080,
  small: 400,
  thumb: 200,
} as const;

const PEXELS_VARIANT_WIDTHS = {
  large2x: 1880,
  large: 650,
  medium: 350,
  small: 130,
} as const;

function pushImageVariant(
  variants: ImageSizeVariant[],
  url: unknown,
  width: number,
): void {
  if (typeof url !== "string" || !url.trim() || width <= 0) return;
  const trimmed = url.trim();
  if (variants.some((variant) => variant.url === trimmed)) return;
  variants.push({ url: trimmed, width });
}

/** Bucket client DPR width so feed/search caches stay bounded. */
export function bucketImageDisplayWidth(raw: number): number {
  const clamped = Math.max(
    MIN_IMAGE_DISPLAY_WIDTH,
    Math.min(MAX_IMAGE_DISPLAY_WIDTH, Math.round(raw)),
  );
  if (clamped <= 720) return 640;
  if (clamped <= 1260) return 1080;
  if (clamped <= 1620) return 1440;
  return PREFERRED_MAX_IMAGE_WIDTH;
}

export function normalizeImageDisplayWidth(raw?: number): number {
  return bucketImageDisplayWidth(raw ?? DEFAULT_IMAGE_DISPLAY_WIDTH);
}

/**
 * Pick the smallest variant that meets the target width without exceeding
 * PREFERRED_MAX_IMAGE_WIDTH — avoids shipping 2K+ to low-DPR devices.
 */
export function pickImageUrlForDisplayWidth(
  variants: ImageSizeVariant[],
  targetPixelWidth: number,
): string | null {
  if (variants.length === 0) return null;

  const target = normalizeImageDisplayWidth(targetPixelWidth);

  const sorted = [...variants]
    .filter((variant) => variant.url && variant.width > 0)
    .sort((a, b) => a.width - b.width);

  if (sorted.length === 0) return null;

  const withinMax = sorted.filter(
    (variant) => variant.width <= PREFERRED_MAX_IMAGE_WIDTH,
  );
  const pool = withinMax.length > 0 ? withinMax : sorted;

  const ideal = pool.find((variant) => variant.width >= target);
  if (ideal) return ideal.url;

  return pool[pool.length - 1]?.url ?? sorted[sorted.length - 1]?.url ?? null;
}

export function resolveImageHitForDisplayWidth(
  hit: ImageHit,
  targetPixelWidth: number,
): ImageHit {
  const variants =
    hit.variants && hit.variants.length > 0
      ? hit.variants
      : hit.url
        ? [
            {
              url: hit.url,
              width: hit.width ?? DEFAULT_IMAGE_DISPLAY_WIDTH,
            },
          ]
        : [];

  const url = pickImageUrlForDisplayWidth(variants, targetPixelWidth);
  if (!url) return hit;

  const selected = variants.find((variant) => variant.url === url);
  return {
    ...hit,
    url,
    width: selected?.width ?? hit.width,
  };
}

const ALLOWED_VIDEO_MEDIA_HOSTS = ["pexels.com", "pixabay.com"] as const;

function isAllowedVideoMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_VIDEO_MEDIA_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

function isValidHttpsMp4Url(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    if (!isAllowedVideoMediaHost(url.hostname)) return false;
    return url.pathname.endsWith(".mp4");
  } catch {
    return false;
  }
}

/** Poster/thumbnail URLs from Pexels or Pixabay CDNs (not MP4). */
function isValidUpstreamMediaUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && isAllowedVideoMediaHost(url.hostname);
  } catch {
    return false;
  }
}

function parseOptionalUpstreamMediaUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed && isValidUpstreamMediaUrl(trimmed) ? trimmed : undefined;
}

const PREFERRED_MAX_VIDEO_WIDTH = 1920;
const MIN_FALLBACK_VIDEO_WIDTH = 720;
const MIN_ACCEPTABLE_VIDEO_WIDTH = 640;

function selectBestMp4File(
  files: PexelsVideoFileCandidate[],
): { link: string; width: number; height?: number } | null {
  const mp4Files = files
    .map((file) => ({
      link: typeof file.link === "string" ? file.link.trim() : "",
      fileType: typeof file.file_type === "string" ? file.file_type.trim() : "",
      width: typeof file.width === "number" ? file.width : 0,
      height: typeof file.height === "number" ? file.height : undefined,
    }))
    .filter(
      (file) =>
        file.fileType === "video/mp4" &&
        file.link &&
        isValidHttpsMp4Url(file.link),
    );

  if (mp4Files.length === 0) return null;

  const byWidthDesc = [...mp4Files].sort((a, b) => b.width - a.width);
  const filteredMp4Files = mp4Files.filter(
    (file) => file.width >= MIN_ACCEPTABLE_VIDEO_WIDTH,
  );

  if (filteredMp4Files.length > 0) {
    const byWidthDescFiltered = [...filteredMp4Files].sort(
      (a, b) => b.width - a.width,
    );

    const upTo1080p = byWidthDescFiltered.filter(
      (file) => file.width <= PREFERRED_MAX_VIDEO_WIDTH,
    );
    if (upTo1080p.length > 0) {
      const best = upTo1080p[0];
      return { link: best.link, width: best.width, height: best.height };
    }

    const above1080p = [...filteredMp4Files]
      .filter((file) => file.width > PREFERRED_MAX_VIDEO_WIDTH)
      .sort((a, b) => a.width - b.width);
    if (above1080p.length > 0) {
      const best = above1080p[0];
      return { link: best.link, width: best.width, height: best.height };
    }
  }

  const above720 = byWidthDesc.filter(
    (file) => file.width >= MIN_FALLBACK_VIDEO_WIDTH,
  );
  if (above720.length > 0) {
    const best = above720[0];
    return { link: best.link, width: best.width, height: best.height };
  }

  const above640 = byWidthDesc.filter(
    (file) => file.width >= MIN_ACCEPTABLE_VIDEO_WIDTH,
  );
  if (above640.length > 0) {
    const best = above640[0];
    return { link: best.link, width: best.width, height: best.height };
  }

  return null;
}

function isPortraitHit(hit: PexelsVideoHit): boolean {
  return (hit.height ?? 0) > (hit.width ?? 0);
}

function isLandscapeHit(hit: PexelsVideoHit): boolean {
  return (hit.width ?? 0) >= (hit.height ?? 0);
}

function filterHitsByOrientation(
  hits: PexelsVideoHit[],
  preference: VideoOrientationPreference,
): PexelsVideoHit[] {
  const portraitHits = hits.filter(isPortraitHit);
  const landscapeHits = hits.filter(isLandscapeHit);

  if (preference === "portrait") {
    return portraitHits.length > 0 ? portraitHits : landscapeHits;
  }

  return landscapeHits.length > 0 ? landscapeHits : portraitHits;
}

export function pickBestVideoHit(
  hits: PexelsVideoHit[],
  preference: VideoOrientationPreference = "portrait",
): PexelsVideoHit | null {
  const candidates = filterHitsByOrientation(hits, preference);
  if (candidates.length === 0) return null;

  return candidates.reduce((best, hit) =>
    (hit.width ?? 0) > (best.width ?? 0) ? hit : best,
  );
}

export function pickBestPexelsVideoHit(
  hits: PexelsVideoHit[],
): PexelsVideoHit | null {
  return pickBestVideoHit(hits, "portrait");
}

type PixabayVideoSearchResponse = {
  hits?: unknown;
};

type PixabayVideoStreamCandidate = {
  url?: unknown;
  width?: unknown;
  height?: unknown;
  thumbnail?: unknown;
};

type PixabayVideoCandidate = {
  duration?: unknown;
  videos?: unknown;
};

const PIXABAY_STREAM_SIZES = ["large", "medium", "small", "tiny"] as const;

function selectBestPixabayStream(
  videos: Record<string, PixabayVideoStreamCandidate>,
): { link: string; width: number; height: number; thumbnail?: string } | null {
  const streams = PIXABAY_STREAM_SIZES.map((size) => {
    const stream = videos[size];
    if (!stream || typeof stream !== "object") return null;

    const link = typeof stream.url === "string" ? stream.url.trim() : "";
    const width = typeof stream.width === "number" ? stream.width : 0;
    const height = typeof stream.height === "number" ? stream.height : 0;
    const thumbnail = parseOptionalUpstreamMediaUrl(stream.thumbnail);

    if (!link || width <= 0 || !isValidHttpsMp4Url(link)) return null;

    return { link, width, height, thumbnail };
  }).filter((stream): stream is NonNullable<typeof stream> => stream !== null);

  if (streams.length === 0) return null;

  const byWidthDesc = [...streams].sort((a, b) => b.width - a.width);

  const upTo1080p = byWidthDesc.filter(
    (stream) => stream.width <= PREFERRED_MAX_VIDEO_WIDTH,
  );
  if (upTo1080p.length > 0) {
    return upTo1080p[0];
  }

  const above1080p = [...streams]
    .filter((stream) => stream.width > PREFERRED_MAX_VIDEO_WIDTH)
    .sort((a, b) => a.width - b.width);
  if (above1080p.length > 0) {
    return above1080p[0];
  }

  const above720 = byWidthDesc.filter(
    (stream) => stream.width >= MIN_FALLBACK_VIDEO_WIDTH,
  );
  if (above720.length > 0) {
    return above720[0];
  }

  const above640 = byWidthDesc.filter(
    (stream) => stream.width >= MIN_ACCEPTABLE_VIDEO_WIDTH,
  );
  if (above640.length > 0) {
    return above640[0];
  }

  return null;
}

export function parsePixabayVideoResults(data: unknown): PexelsVideoHit[] {
  if (!data || typeof data !== "object") {
    throw new HttpError("Invalid Pixabay response", 502, "UPSTREAM_INVALID");
  }

  const hits = (data as PixabayVideoSearchResponse).hits;
  if (hits !== undefined && !Array.isArray(hits)) {
    throw new HttpError("Invalid Pixabay response", 502, "UPSTREAM_INVALID");
  }

  const parsed: PexelsVideoHit[] = [];

  for (const item of hits ?? []) {
    if (!item || typeof item !== "object") continue;

    const video = item as PixabayVideoCandidate;
    const streams =
      video.videos && typeof video.videos === "object"
        ? (video.videos as Record<string, PixabayVideoStreamCandidate>)
        : {};
    const selected = selectBestPixabayStream(streams);
    if (!selected) continue;

    const duration =
      typeof video.duration === "number" && video.duration > 0
        ? Math.round(video.duration)
        : undefined;

    parsed.push({
      url: selected.link,
      poster: selected.thumbnail,
      duration,
      width: selected.width,
      height: selected.height,
    });
  }

  return parsed;
}

function isPortraitImageHit(hit: ImageHit): boolean {
  return (hit.height ?? 0) > (hit.width ?? 0);
}

/** Portrait hits first; landscape fills remaining slots when portrait is scarce. */
export function prioritizeImageHits(
  hits: ImageHit[],
  preference: ImageOrientationPreference = "portrait",
): ImageHit[] {
  const portraitHits = hits.filter(isPortraitImageHit);
  const landscapeHits = hits.filter((hit) => !isPortraitImageHit(hit));

  if (preference === "portrait") {
    return [...portraitHits, ...landscapeHits];
  }

  return [...landscapeHits, ...portraitHits];
}

export function parseUnsplashImageHits(data: unknown): ImageHit[] {
  if (!data || typeof data !== "object") {
    throw new HttpError("Invalid Unsplash response", 502, "UPSTREAM_INVALID");
  }

  const results = (data as UnsplashSearchResponse).results;
  if (results !== undefined && !Array.isArray(results)) {
    throw new HttpError("Invalid Unsplash response", 502, "UPSTREAM_INVALID");
  }

  const hits: ImageHit[] = [];

  for (const item of results ?? []) {
    if (!item || typeof item !== "object") continue;

    const photo = item as {
      urls?: {
        full?: unknown;
        regular?: unknown;
        small?: unknown;
        thumb?: unknown;
      };
      width?: unknown;
      height?: unknown;
    };

    const nativeWidth =
      typeof photo.width === "number" ? photo.width : undefined;
    const nativeHeight =
      typeof photo.height === "number" ? photo.height : undefined;

    const variants: ImageSizeVariant[] = [];
    pushImageVariant(
      variants,
      photo.urls?.full,
      nativeWidth
        ? Math.min(nativeWidth, PREFERRED_MAX_IMAGE_WIDTH)
        : PREFERRED_MAX_IMAGE_WIDTH,
    );
    pushImageVariant(
      variants,
      photo.urls?.regular,
      UNSPLASH_VARIANT_WIDTHS.regular,
    );
    pushImageVariant(
      variants,
      photo.urls?.small,
      UNSPLASH_VARIANT_WIDTHS.small,
    );
    pushImageVariant(
      variants,
      photo.urls?.thumb,
      UNSPLASH_VARIANT_WIDTHS.thumb,
    );

    if (variants.length === 0) continue;

    const url =
      pickImageUrlForDisplayWidth(variants, DEFAULT_IMAGE_DISPLAY_WIDTH) ??
      variants[0].url;

    hits.push({
      url,
      width: nativeWidth,
      height: nativeHeight,
      variants,
    });
  }

  return hits;
}

export function parseUnsplashResults(data: unknown): string[] {
  return parseUnsplashImageHits(data).map((hit) => hit.url);
}

export function parsePexelsVideoResults(data: unknown): PexelsVideoHit[] {
  if (!data || typeof data !== "object") {
    throw new HttpError("Invalid Pexels response", 502, "UPSTREAM_INVALID");
  }

  const videos = (data as PexelsVideoSearchResponse).videos;
  if (videos !== undefined && !Array.isArray(videos)) {
    throw new HttpError("Invalid Pexels response", 502, "UPSTREAM_INVALID");
  }

  const hits: PexelsVideoHit[] = [];

  for (const item of videos ?? []) {
    if (!item || typeof item !== "object") continue;

    const video = item as PexelsVideoCandidate;
    const files = Array.isArray(video.video_files)
      ? (video.video_files as PexelsVideoFileCandidate[])
      : [];
    const selected = selectBestMp4File(files);
    if (!selected) continue;

    const poster = parseOptionalUpstreamMediaUrl(video.image);
    const duration =
      typeof video.duration === "number" && video.duration > 0
        ? Math.round(video.duration)
        : undefined;

    hits.push({
      url: selected.link,
      poster,
      duration,
      width: selected.width,
      height: selected.height,
    });
  }

  return hits;
}

export function parsePexelsImageHits(data: unknown): ImageHit[] {
  if (!data || typeof data !== "object") {
    throw new HttpError("Invalid Pexels response", 502, "UPSTREAM_INVALID");
  }

  const photos = (data as PexelsSearchResponse).photos;
  if (photos !== undefined && !Array.isArray(photos)) {
    throw new HttpError("Invalid Pexels response", 502, "UPSTREAM_INVALID");
  }

  const hits: ImageHit[] = [];

  for (const item of photos ?? []) {
    if (!item || typeof item !== "object") continue;

    const photo = item as {
      src?: {
        original?: unknown;
        large2x?: unknown;
        large?: unknown;
        medium?: unknown;
        small?: unknown;
      };
      width?: unknown;
      height?: unknown;
    };

    const nativeWidth =
      typeof photo.width === "number" ? photo.width : undefined;
    const nativeHeight =
      typeof photo.height === "number" ? photo.height : undefined;

    const variants: ImageSizeVariant[] = [];
    if (nativeWidth && nativeWidth > 0) {
      pushImageVariant(
        variants,
        photo.src?.original,
        Math.min(nativeWidth, PREFERRED_MAX_IMAGE_WIDTH),
      );
    }
    pushImageVariant(
      variants,
      photo.src?.large2x,
      Math.min(PEXELS_VARIANT_WIDTHS.large2x, PREFERRED_MAX_IMAGE_WIDTH),
    );
    pushImageVariant(variants, photo.src?.large, PEXELS_VARIANT_WIDTHS.large);
    pushImageVariant(variants, photo.src?.medium, PEXELS_VARIANT_WIDTHS.medium);
    pushImageVariant(variants, photo.src?.small, PEXELS_VARIANT_WIDTHS.small);

    if (variants.length === 0) continue;

    const url =
      pickImageUrlForDisplayWidth(variants, DEFAULT_IMAGE_DISPLAY_WIDTH) ??
      variants[0].url;

    hits.push({
      url,
      width: nativeWidth,
      height: nativeHeight,
      variants,
    });
  }

  return hits;
}

export function parsePexelsResults(data: unknown): string[] {
  return parsePexelsImageHits(data).map((hit) => hit.url);
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

type NewsArticleCandidate = {
  title?: unknown;
  description?: unknown;
  url?: unknown;
  publishedAt?: unknown;
  published?: unknown;
  source?: unknown;
  author?: unknown;
};

function normalizeNewsArticle(
  item: NewsArticleCandidate,
  publishedField: "publishedAt" | "published",
): RawNewsArticle | null {
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (!title || !isValidHttpsUrl(url)) return null;

  const rawDescription =
    typeof item.description === "string" ? item.description : "";
  const description = rawDescription ? stripHtml(rawDescription) : null;

  const publishedRaw = item[publishedField];
  const publishedAt =
    typeof publishedRaw === "string" && publishedRaw.trim()
      ? publishedRaw.trim()
      : new Date().toISOString();

  let source: string | undefined;
  if (item.source && typeof item.source === "object") {
    const name = (item.source as { name?: unknown }).name;
    source = typeof name === "string" ? name.trim() : undefined;
  } else if (typeof item.author === "string" && item.author.trim()) {
    source = item.author.trim();
  }

  return { title, description, url, publishedAt, source };
}

export function parseGNewsArticles(data: unknown): RawNewsArticle[] {
  if (!data || typeof data !== "object") return [];

  const articles = (data as { articles?: unknown }).articles;
  if (!Array.isArray(articles)) return [];

  const parsed: RawNewsArticle[] = [];
  for (const item of articles) {
    if (!item || typeof item !== "object") continue;
    const normalized = normalizeNewsArticle(
      item as NewsArticleCandidate,
      "publishedAt",
    );
    if (normalized) parsed.push(normalized);
    if (parsed.length >= 10) break;
  }

  return parsed;
}

export function parseCurrentsArticles(data: unknown): RawNewsArticle[] {
  if (!data || typeof data !== "object") return [];

  const news = (data as { news?: unknown }).news;
  if (!Array.isArray(news)) return [];

  const parsed: RawNewsArticle[] = [];
  for (const item of news) {
    if (!item || typeof item !== "object") continue;
    const normalized = normalizeNewsArticle(
      item as NewsArticleCandidate,
      "published",
    );
    if (normalized) parsed.push(normalized);
    if (parsed.length >= 10) break;
  }

  return parsed;
}
