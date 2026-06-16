import {
  normalizeImageUrls,
  stripUrlsFromText,
} from "@/lib/normalize-image-url";
import type { Country, CountryVideo } from "@/types/country";

const MISSING_CAPITAL_MARKERS = new Set(["—", "-", "N/A", "NA", "n/a"]);

/** Capital for feed/card subtitles; missing capitals show N/A. */
export function formatCountryCapitalDisplay(capital?: string): string {
  const value = capital?.trim();
  if (!value || MISSING_CAPITAL_MARKERS.has(value)) {
    return "N/A";
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

const LANDMARK_DESCRIPTION_MIN_LENGTH = 20;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when landmark copy is empty or a generic pipeline placeholder. */
export function isLandmarkDescriptionThin(
  description: string | undefined,
  landmark: { name: string; type?: string },
): boolean {
  const trimmed = description?.trim() ?? "";
  if (!trimmed || trimmed.length <= LANDMARK_DESCRIPTION_MIN_LENGTH) {
    return true;
  }

  const name = escapeRegExp(landmark.name.trim());
  const type = escapeRegExp(formatLandmarkTypeDisplay(landmark.type));

  if (
    new RegExp(`^${name}\\s*—\\s*.+\\s+in the region\\.?$`, "i").test(trimmed)
  ) {
    return true;
  }

  if (
    new RegExp(`^${name}\\s+is a notable\\s+.+\\s+in the area\\.?$`, "i").test(
      trimmed,
    )
  ) {
    return true;
  }

  if (
    type !== "Landmark" &&
    new RegExp(`^${type}\\s+in\\s+`, "i").test(trimmed)
  ) {
    return true;
  }

  return false;
}

/** Compact landmark type for cards and stats — never the UNESCO heritage label. */
export function formatLandmarkTypeDisplay(type?: string): string {
  const trimmed = type?.trim();
  if (!trimmed) return "Landmark";
  if (/^unesco world heritage site$/i.test(trimmed)) {
    return "Landmark";
  }
  return trimmed;
}

export function isLandmarkUnesco(landmark: {
  type?: string;
  description?: string;
  isUnescoWorldHeritage?: boolean;
}): boolean {
  if (landmark.isUnescoWorldHeritage === true) return true;
  if (landmark.isUnescoWorldHeritage === false) return false;

  const type = landmark.type?.toLowerCase() ?? "";
  const description = landmark.description?.toLowerCase() ?? "";
  return (
    type.includes("unesco") ||
    type.includes("world heritage") ||
    description.includes("unesco") ||
    description.includes("world heritage")
  );
}

export function formatLandmarkHeritageDisplay(): string {
  return "UNESCO World Heritage Site";
}

export function formatLandmarkCity(city?: string | null): string {
  const trimmed = city?.trim();
  return trimmed || "—";
}

const WIKI_CITY_REJECT_WORDS = new Set([
  "the",
  "a",
  "an",
  "northern",
  "southern",
  "eastern",
  "western",
  "central",
  "north",
  "south",
  "east",
  "west",
  "region",
  "area",
  "country",
  "state",
  "province",
  "district",
  "county",
  "centre",
  "center",
  "heart",
  "middle",
  "old",
  "new",
  "inner",
  "outer",
  "upper",
  "lower",
  "greater",
  "metropolitan",
]);

const WIKI_CITY_REJECT_PHRASE =
  /\b(river|island|mount|mountain|valley|lake|sea|ocean|harbor|harbour|square|street|road|bank of|north of|south of|east of|west of)\b/i;

function normalizeWikiCityCandidate(raw: string): string | null {
  let city = raw.trim().replace(/\s+/g, " ");
  city = city.replace(/\s+(metropolitan area|area|region)$/i, "").trim();
  if (city.length < 2) return null;
  if (WIKI_CITY_REJECT_PHRASE.test(city)) return null;

  const lower = city.toLowerCase();
  if (WIKI_CITY_REJECT_WORDS.has(lower)) return null;
  if (/^(the|a|an)\s/i.test(city)) return null;

  return city;
}

function wikiCountryNamesMatch(
  candidate: string,
  countryName: string,
): boolean {
  const left = candidate.trim().toLowerCase();
  const right = countryName.trim().toLowerCase();
  if (!left || !right) return false;
  return left === right || left.startsWith(right) || right.startsWith(left);
}

const WIKI_CITY_NAME = String.raw`[\p{L}][\p{L}\s'.-]*?`;

function splitWikiSentences(text: string): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return [];

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function inferCityFromWikiText(
  text: string,
  countryName?: string,
): string | null {
  const tryMatch = (pattern: RegExp): string | null => {
    const match = text.match(pattern);
    if (!match?.[1]) return null;
    return normalizeWikiCityCandidate(match[1]);
  };

  let city = tryMatch(
    new RegExp(`\\b(?:the )?city of (${WIKI_CITY_NAME})(?=[,;.]|$)`, "iu"),
  );
  if (city) return city;

  city = tryMatch(
    new RegExp(
      `\\bin the(?: [\\p{L}\\w-]+)? city of (${WIKI_CITY_NAME})(?=[,;.]|$)`,
      "iu",
    ),
  );
  if (city) return city;

  city = tryMatch(
    new RegExp(
      `\\b(?:located|situated) in (?:the )?(${WIKI_CITY_NAME})(?=[,;.]|$)`,
      "iu",
    ),
  );
  if (city) return city;

  city = tryMatch(
    new RegExp(`\\b(?:centre|center) of (${WIKI_CITY_NAME})(?=[,;.]|$)`, "iu"),
  );
  if (city) return city;

  city = tryMatch(new RegExp(`\\bnear (${WIKI_CITY_NAME})(?=[,;.]|$)`, "iu"));
  if (city) return city;

  const country = countryName?.trim();
  if (country) {
    city = tryMatch(
      new RegExp(
        `\\bin (${WIKI_CITY_NAME}),\\s*${escapeRegExp(country)}(?:\\s|,|\\.|$)`,
        "iu",
      ),
    );
    if (city) return city;

    const commaMatch = text.match(
      new RegExp(`\\bin (${WIKI_CITY_NAME}),\\s*([^.,;]+)`, "iu"),
    );
    if (
      commaMatch?.[1] &&
      commaMatch[2] &&
      wikiCountryNamesMatch(commaMatch[2], country)
    ) {
      city = normalizeWikiCityCandidate(commaMatch[1]);
      if (city) return city;
    }
  }

  city = tryMatch(new RegExp(`\\bin (${WIKI_CITY_NAME}),\\s+\\p{L}`, "iu"));
  if (city) return city;

  return null;
}

/** Best-effort city from a Wikipedia lead paragraph when structured data is missing. */
export function inferLandmarkCityFromWikipediaExtract(
  extract: string,
  countryName?: string,
): string | null {
  const paragraph = extract.trim().replace(/\s+/g, " ");
  if (!paragraph) return null;

  for (const sentence of splitWikiSentences(paragraph)) {
    const city = inferCityFromWikiText(sentence, countryName);
    if (city) return city;
  }

  return inferCityFromWikiText(paragraph, countryName);
}

/** Try several text sources (Wikipedia extract, pipeline description, AI fact). */
export function inferLandmarkCityFromTextSources(
  sources: Array<string | null | undefined>,
  countryName?: string,
): string | null {
  for (const source of sources) {
    const trimmed = source?.trim();
    if (!trimmed) continue;

    const city = inferLandmarkCityFromWikipediaExtract(trimmed, countryName);
    if (city) return city;
  }

  return null;
}

export function formatLandmarkYearBuilt(yearBuilt?: number | null): string {
  if (
    typeof yearBuilt !== "number" ||
    !Number.isFinite(yearBuilt) ||
    yearBuilt <= 0
  ) {
    return "—";
  }

  return String(Math.round(yearBuilt));
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

/** Hero image for country cards (saved, visited, history lists). */
export function getCountryCardHeroUri(country: {
  images?: string[];
  flag?: string;
}): string | undefined {
  const images = getCountryImages(country);
  const flag = country.flag?.trim();
  return images[0] ?? (flag ? flag : undefined);
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
