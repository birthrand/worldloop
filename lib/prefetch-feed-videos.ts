import { prefetchCountryImage } from "@/components/explore/country-image";
import { videos as bundledVideos } from "@/constants/videos";
import {
  cultureVideoSourceKey,
  primePooledCultureVideoPlayer,
} from "@/lib/culture-video-player-pool";
import { getCultureVideo, hasCultureVideo } from "@/lib/format-country";
import {
  FEED_HERO_PREFETCH_AHEAD,
  FEED_HERO_PREFETCH_BEHIND,
} from "@/lib/prefetch-feed-heroes";
import { isFirstFrameReady } from "@/lib/video-first-frame-registry";
import type { Country, CountryVideo } from "@/types/country";

const inflightPrimes = new Map<string, Promise<void>>();

function resolveCultureVideoSource(
  video: CountryVideo,
): string | number | null {
  if (video.provider === "demo") {
    return bundledVideos.onboardingHero;
  }
  return video.url;
}

function countryCultureVideoSource(
  country: Country | undefined,
): string | number | null {
  if (!country || !hasCultureVideo(country)) return null;
  const video = getCultureVideo(country);
  if (!video) return null;
  return resolveCultureVideoSource(video);
}

export function isCultureVideoReady(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  return isFirstFrameReady(cultureVideoSourceKey(url));
}

function prefetchCultureVideoPoster(country: Country | undefined): void {
  const video = country ? getCultureVideo(country) : null;
  const poster = video?.poster?.trim();
  if (poster) {
    void prefetchCountryImage(poster);
  }
}

/**
 * Start buffering bytes and one-shot first-frame capture during warm-up.
 * Does not retain players; mounted slides own long-lived observation.
 */
export function prefetchCultureVideoSource(
  source: string | number | null | undefined,
): Promise<void> {
  if (source === null || source === undefined) return Promise.resolve();

  const cacheKey = cultureVideoSourceKey(source);
  if (isFirstFrameReady(cacheKey)) return Promise.resolve();

  const existing = inflightPrimes.get(cacheKey);
  if (existing) return existing;

  const promise = Promise.resolve()
    .then(() => {
      primePooledCultureVideoPlayer(source);
    })
    .catch(() => undefined)
    .finally(() => {
      inflightPrimes.delete(cacheKey);
    });

  inflightPrimes.set(cacheKey, promise);
  return promise;
}

function collectCultureVideoSourcesAroundIndex(
  countries: Country[],
  aroundIndex: number,
  ahead = FEED_HERO_PREFETCH_AHEAD,
  behind = FEED_HERO_PREFETCH_BEHIND,
): Array<string | number> {
  if (countries.length === 0) return [];

  const clampedIndex = Math.max(0, Math.min(aroundIndex, countries.length - 1));
  const start = Math.max(0, clampedIndex - behind);
  const end = Math.min(countries.length - 1, clampedIndex + ahead);
  const seen = new Set<string>();
  const sources: Array<string | number> = [];

  for (let index = start; index <= end; index += 1) {
    const source = countryCultureVideoSource(countries[index]);
    if (source === null) continue;

    const cacheKey = cultureVideoSourceKey(source);
    if (seen.has(cacheKey)) continue;
    seen.add(cacheKey);
    sources.push(source);
  }

  return sources;
}

/** Pre-toggle warm for countries not yet mounted on a card. */
export function warmCountryCultureVideo(country: Country): void {
  prefetchCultureVideoPoster(country);
  const source = countryCultureVideoSource(country);
  if (source !== null) {
    void prefetchCultureVideoSource(source);
  }
}

/** Rolling window when Explore hero is in video mode. */
export async function prefetchFeedVideosAroundIndex(
  countries: Country[],
  aroundIndex: number,
): Promise<void> {
  if (countries.length === 0) return;

  const clampedIndex = Math.max(0, Math.min(aroundIndex, countries.length - 1));
  const start = Math.max(0, clampedIndex - FEED_HERO_PREFETCH_BEHIND);
  const end = Math.min(
    countries.length - 1,
    clampedIndex + FEED_HERO_PREFETCH_AHEAD,
  );

  for (let index = start; index <= end; index += 1) {
    prefetchCultureVideoPoster(countries[index]);
  }

  const sources = collectCultureVideoSourcesAroundIndex(countries, aroundIndex);
  await Promise.all(
    sources.map((source) => prefetchCultureVideoSource(source)),
  );
}

/** Swipe intent in video mode — prioritize next clip, then the window. */
export function warmFeedVideosOnSwipeBegin(
  countries: Country[],
  currentIndex: number,
): void {
  prefetchCultureVideoPoster(countries[currentIndex + 1]);
  const nextSource = countryCultureVideoSource(countries[currentIndex + 1]);
  if (nextSource !== null) {
    void prefetchCultureVideoSource(nextSource);
  }

  void prefetchFeedVideosAroundIndex(countries, currentIndex + 1);
}
