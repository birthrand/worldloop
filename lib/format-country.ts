import {
  normalizeImageUrls,
  stripUrlsFromText,
} from "@/lib/normalize-image-url";
import type { Country, CountryVideo } from "@/types/country";

const MISSING_CAPITAL_MARKERS = new Set(["—", "-", "N/A", "NA", "n/a"]);

/** Capital for feed/card subtitles; missing capitals use a fixed territory label. */
export function formatCountryCapitalDisplay(capital?: string): string {
  const value = capital?.trim();
  if (!value || MISSING_CAPITAL_MARKERS.has(value)) {
    return "NO SOVEREIGN GOVERNMENT";
  }
  return value;
}

/** Ensure landmark copy always starts with a capital letter. */
export function formatLandmarkDescription(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return trimmed;
  const first = trimmed.charAt(0);
  if (first === first.toUpperCase()) return trimmed;
  return first.toUpperCase() + trimmed.slice(1);
}

/** Compact landmark type for card subtitles (e.g. UNESCO World Heritage Site → UNESCO Site). */
export function formatLandmarkTypeDisplay(type?: string): string {
  const trimmed = type?.trim();
  if (!trimmed) return "Landmark";
  if (/^unesco world heritage site$/i.test(trimmed)) {
    return "UNESCO Site";
  }
  return trimmed;
}

/** Compact population label (e.g. 33.7M). */
export function formatPopulation(population: number): string {
  // Runtime safety: backend responses can occasionally miss population,
  // and we must not crash the feed renderer.
  if (!Number.isFinite(population)) return "—";

  if (population >= 1_000_000_000) {
    return `${(population / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (population >= 1_000_000) {
    return `${(population / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (population >= 1_000) {
    return `${(population / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return population.toLocaleString();
}

/** Human-readable coordinates (e.g. 9.08° N, 8.68° E). */
/** Comma-separated official languages for profile UI. */
export function formatOfficialLanguages(languages?: string[]): string {
  if (!languages?.length) return "—";

  const unique = [
    ...new Set(languages.map((item) => item.trim()).filter(Boolean)),
  ];
  if (unique.length === 0) return "—";
  if (unique.length <= 3) return unique.join(", ");

  return `${unique.slice(0, 3).join(", ")} +${unique.length - 3}`;
}

export function formatCoordinates(latlng: [number, number]): string {
  const [lat, lng] = latlng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "—";

  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lng).toFixed(2)}° ${lngDir}`;
}

export function formatSubregion(subregion?: string): string {
  const value = subregion?.trim();
  return value || "—";
}

export function formatCountryCode(cca2?: string): string {
  const code = cca2?.trim().toUpperCase();
  return code || "—";
}

export function formatArea(area?: number): string {
  if (!Number.isFinite(area) || !area || area <= 0) return "—";

  if (area >= 1_000_000) {
    return `${(area / 1_000_000).toFixed(1).replace(/\.0$/, "")}M km²`;
  }
  return `${Math.round(area).toLocaleString()} km²`;
}

export function formatLandlocked(landlocked?: boolean): string {
  if (landlocked === true) return "Yes";
  if (landlocked === false) return "No";
  return "—";
}

export function formatPrimaryTimezone(timezones?: string[]): string {
  const zones = timezones?.map((zone) => zone.trim()).filter(Boolean) ?? [];
  if (zones.length === 0) return "—";
  if (zones.length === 1) return zones[0];
  return `${zones[0]} (+${zones.length - 1})`;
}

export function formatHemisphere(latlng: [number, number]): string {
  const [lat, lng] = latlng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "—";

  const latPart =
    Math.abs(lat) < 5 ? "Equatorial" : lat > 0 ? "Northern" : "Southern";
  const lngPart = Math.abs(lng) < 5 ? null : lng > 0 ? "Eastern" : "Western";

  if (latPart === "Equatorial" && !lngPart) return "Equatorial";
  if (!lngPart) return `${latPart} Hemisphere`;
  return `${latPart} & ${lngPart}`;
}

export function formatClimateZone(latlng: [number, number]): string {
  const lat = Math.abs(latlng[0]);
  if (!Number.isFinite(lat)) return "—";
  if (lat < 23.5) return "Tropical";
  if (lat < 35) return "Subtropical";
  if (lat < 66.5) return "Temperate";
  return "Polar";
}

export function getCountryImages(country: { images?: string[] }): string[] {
  if (!country.images?.length) return [];
  return normalizeImageUrls(country.images);
}

function isValidVideoUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Normalized, deduped video list for a country. */
export function getCountryVideos(country: {
  name?: string;
  videos?: CountryVideo[];
  images?: string[];
}): CountryVideo[] {
  const seen = new Set<string>();
  const result: CountryVideo[] = [];

  for (const item of country.videos ?? []) {
    if (!isValidVideoUrl(item.url) || seen.has(item.url)) continue;
    seen.add(item.url);
    result.push({
      url: item.url,
      ...(item.poster ? { poster: item.poster } : {}),
      ...(item.provider ? { provider: item.provider } : {}),
      ...(item.duration !== undefined ? { duration: item.duration } : {}),
    });
  }

  if (result.length === 0 && __DEV__) {
    const images = getCountryImages(country);
    const poster = images[0] ?? undefined;
    return [
      {
        url: "demo://onboarding-hero",
        poster,
        provider: "demo",
      },
    ];
  }

  return result;
}

/** Primary culture clip for the Culture tab (first valid video). */
export function getCultureVideo(country: Country): CountryVideo | null {
  return getCountryVideos(country)[0] ?? null;
}

export function hasCultureVideo(country: Country): boolean {
  return getCultureVideo(country) !== null;
}

/** Poster / still for Culture top-bar blur and loading state. */
export function getCulturePosterUri(country: Country): string | undefined {
  const video = getCultureVideo(country);
  if (video?.poster) return video.poster;
  const images = getCountryImages(country);
  return images[0] ?? country.flag;
}

function cleanAiLine(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  return stripUrlsFromText(raw.trim());
}

export function getAiFact(country: { ai?: { fact?: string } }): string {
  const text = cleanAiLine(country.ai?.fact);
  return text || "Fun fact loading…";
}

/** Fact for carousel slot `index` (cycles when fewer facts than images). */
export function getAiFactByIndex(
  country: {
    ai?: {
      fact?: string;
      facts?: string[];
      caption?: string;
      narration?: string;
    };
  },
  index: number,
): string {
  const facts = country.ai?.facts
    ?.map((item) => cleanAiLine(item))
    .filter(Boolean);

  if (facts?.length) {
    return facts[index % facts.length] ?? getAiFact(country);
  }

  const pool = [
    cleanAiLine(country.ai?.fact),
    cleanAiLine(country.ai?.caption),
    cleanAiLine(country.ai?.narration),
  ].filter(Boolean);

  if (pool.length === 0) return "Fun fact loading…";
  return pool[index % pool.length];
}

/** Unique AI facts for profile "Did you know" (up to 4). */
export function getProfileAiFacts(country: {
  ai?: {
    fact?: string;
    facts?: string[];
    narration?: string;
  };
}): string[] {
  const candidates = [
    ...(country.ai?.facts ?? []),
    country.ai?.fact,
    country.ai?.narration,
  ]
    .map((item) => cleanAiLine(item))
    .filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of candidates) {
    if (seen.has(line)) continue;
    seen.add(line);
    result.push(line);
    if (result.length >= 4) break;
  }

  return result;
}

export function getTravelerNote(country: {
  ai?: { caption?: string };
}): string | null {
  const caption = cleanAiLine(country.ai?.caption);
  return caption || null;
}

export function getDidYouKnowText(country: {
  ai?: { caption?: string; fact?: string };
}): string {
  const caption = country.ai?.caption?.trim();
  if (caption) {
    const text = stripUrlsFromText(caption);
    if (text) return text;
  }
  const fact = country.ai?.fact?.trim();
  if (fact) {
    const text = stripUrlsFromText(fact);
    if (text) return text;
  }
  return "Discover something new about this country as you explore.";
}
