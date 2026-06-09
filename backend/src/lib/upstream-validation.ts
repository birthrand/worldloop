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
};

function isValidHttpsMp4Url(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    return (
      url.pathname.endsWith(".mp4") ||
      url.hostname.toLowerCase().includes("pexels.com")
    );
  } catch {
    return false;
  }
}

const PREFERRED_MAX_VIDEO_WIDTH = 1920;
const MIN_FALLBACK_VIDEO_WIDTH = 720;
const MIN_ACCEPTABLE_VIDEO_WIDTH = 640;

function selectBestMp4File(
  files: PexelsVideoFileCandidate[],
): { link: string; width: number } | null {
  const mp4Files = files
    .map((file) => ({
      link: typeof file.link === "string" ? file.link.trim() : "",
      fileType: typeof file.file_type === "string" ? file.file_type.trim() : "",
      width: typeof file.width === "number" ? file.width : 0,
    }))
    .filter(
      (file) =>
        file.fileType === "video/mp4" &&
        file.link &&
        isValidHttpsMp4Url(file.link),
    );

  if (mp4Files.length === 0) return null;

  const byWidthDesc = [...mp4Files].sort((a, b) => b.width - a.width);

  const upTo1080p = byWidthDesc.filter(
    (file) => file.width <= PREFERRED_MAX_VIDEO_WIDTH,
  );
  if (upTo1080p.length > 0) {
    return { link: upTo1080p[0].link, width: upTo1080p[0].width };
  }

  const above1080p = [...mp4Files]
    .filter((file) => file.width > PREFERRED_MAX_VIDEO_WIDTH)
    .sort((a, b) => a.width - b.width);
  if (above1080p.length > 0) {
    return { link: above1080p[0].link, width: above1080p[0].width };
  }

  const above720 = byWidthDesc.filter(
    (file) => file.width >= MIN_FALLBACK_VIDEO_WIDTH,
  );
  if (above720.length > 0) {
    return { link: above720[0].link, width: above720[0].width };
  }

  const above640 = byWidthDesc.filter(
    (file) => file.width >= MIN_ACCEPTABLE_VIDEO_WIDTH,
  );
  if (above640.length > 0) {
    return { link: above640[0].link, width: above640[0].width };
  }

  return null;
}

export function pickBestPexelsVideoHit(
  hits: PexelsVideoHit[],
): PexelsVideoHit | null {
  if (hits.length === 0) return null;

  return hits.reduce((best, hit) =>
    (hit.width ?? 0) > (best.width ?? 0) ? hit : best,
  );
}

export function parseUnsplashResults(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    throw new HttpError("Invalid Unsplash response", 502, "UPSTREAM_INVALID");
  }

  const results = (data as UnsplashSearchResponse).results;
  if (results !== undefined && !Array.isArray(results)) {
    throw new HttpError("Invalid Unsplash response", 502, "UPSTREAM_INVALID");
  }

  return (results ?? [])
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const url = (item as { urls?: { regular?: unknown } }).urls?.regular;
      return typeof url === "string" ? url : null;
    })
    .filter((url): url is string => Boolean(url));
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

    const poster =
      typeof video.image === "string" && video.image.trim()
        ? video.image.trim()
        : undefined;
    const duration =
      typeof video.duration === "number" && video.duration > 0
        ? Math.round(video.duration)
        : undefined;

    hits.push({
      url: selected.link,
      poster,
      duration,
      width: selected.width,
    });
  }

  return hits;
}

export function parsePexelsResults(data: unknown): string[] {
  if (!data || typeof data !== "object") {
    throw new HttpError("Invalid Pexels response", 502, "UPSTREAM_INVALID");
  }

  const photos = (data as PexelsSearchResponse).photos;
  if (photos !== undefined && !Array.isArray(photos)) {
    throw new HttpError("Invalid Pexels response", 502, "UPSTREAM_INVALID");
  }

  return (photos ?? [])
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const url = (item as { src?: { large?: unknown } }).src?.large;
      return typeof url === "string" ? url : null;
    })
    .filter((url): url is string => Boolean(url));
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
