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
