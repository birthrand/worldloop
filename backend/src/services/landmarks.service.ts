import type { CountryLandmark } from "../types/landmarks.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_USER_AGENT =
  "WorldLoop/1.0 (country landmarks service; learning project)";
const MAX_LANDMARKS = 3;
const MAX_DESCRIPTION_LENGTH = 140;
const MAX_TITLE_CANDIDATES = 18;
const GEOSearch_RADIUS_METERS = 500_000;
const WIKI_REQUEST_GAP_MS = 120;

/** Extra phrases Wikipedia uses instead of the REST Countries common name. */
const COUNTRY_MENTION_ALIASES: Record<string, string[]> = {
  "south korea": ["republic of korea", " korea,", " korea."],
  "north korea": ["democratic people's republic of korea", "dprk"],
  "united states": ["u.s.", "united states of america", "american"],
  "united kingdom": ["uk", "britain", "great britain"],
  czechia: ["czech republic"],
};

const EXCLUDED_TITLE_PATTERN =
  /rights|province$|economy|military|politics|demographics|education|health|culture of|history of|government of|geography of|transport in|foreign relations|outline of|index of/i;

type LandmarksCountryContext = {
  capital?: string;
  latlng?: [number, number];
};

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{ title: string }>;
  };
};

type WikipediaGeoSearchResponse = {
  query?: {
    geosearch?: Array<{ title: string }>;
  };
};

type WikipediaLinksResponse = {
  query?: {
    pages?: Record<
      string,
      { links?: Array<{ title: string }> } | { missing?: string }
    >;
  };
};

type WikipediaRestSummary = {
  title?: string;
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
};

function wikiHeaders(): HeadersInit {
  return { "User-Agent": WIKIPEDIA_USER_AGENT };
}

function slugifyTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

function trimDescription(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_DESCRIPTION_LENGTH) return normalized;

  const slice = normalized.slice(0, MAX_DESCRIPTION_LENGTH);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 60 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed}…`;
}

function landmarkId(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeCapital(capital?: string): string | null {
  const value = capital?.trim();
  if (!value || value === "—" || value.toLowerCase() === "n/a") return null;
  return value;
}

function getMentionTerms(
  countryName: string,
  capital: string | null,
): string[] {
  const base = countryName.trim().toLowerCase();
  const terms = new Set<string>([base]);

  const aliases = COUNTRY_MENTION_ALIASES[base];
  if (aliases) {
    for (const alias of aliases) terms.add(alias);
  }

  if (capital) terms.add(capital.toLowerCase());

  return [...terms];
}

function textMentionsCountry(text: string, mentionTerms: string[]): boolean {
  const haystack = text.toLowerCase();
  return mentionTerms.some(
    (term) => term.length > 0 && haystack.includes(term),
  );
}

function isExcludedTopicTitle(title: string): boolean {
  return EXCLUDED_TITLE_PATTERN.test(title);
}

function isCountryListPage(title: string, countryName: string): boolean {
  const lower = title.toLowerCase();
  const country = countryName.trim().toLowerCase();
  if (!lower.startsWith("list of")) return false;

  return lower.includes(`in ${country}`) || lower.endsWith(country);
}

function isRelevantTitle(title: string, countryName: string): boolean {
  const lower = title.toLowerCase();
  const countryLower = countryName.toLowerCase();

  if (lower === countryLower) return false;
  if (isExcludedTopicTitle(title)) return false;

  return true;
}

function isRelevantLandmark(
  landmark: CountryLandmark,
  mentionTerms: string[],
): boolean {
  const combined = `${landmark.name} ${landmark.description}`;
  return textMentionsCountry(combined, mentionTerms);
}

function buildSearchQueries(
  countryName: string,
  capital: string | null,
): string[] {
  const queries = [
    `famous landmarks in ${countryName}`,
    `tourist attractions in ${countryName}`,
    `UNESCO World Heritage Sites in ${countryName}`,
  ];

  if (capital) {
    queries.push(
      `landmarks in ${capital}`,
      `monuments in ${capital}, ${countryName}`,
    );
  }

  return queries;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wikipediaSearchTitles(
  srsearch: string,
  limit: number,
): Promise<string[]> {
  await sleep(WIKI_REQUEST_GAP_MS);

  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", srsearch);
  url.searchParams.set("srlimit", String(limit));
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaSearchResponse;
  return data.query?.search?.map((item) => item.title.trim()) ?? [];
}

async function wikipediaGeoSearchTitles(
  lat: number,
  lng: number,
  limit: number,
): Promise<string[]> {
  await sleep(WIKI_REQUEST_GAP_MS);

  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "geosearch");
  url.searchParams.set("gscoord", `${lat}|${lng}`);
  url.searchParams.set("gsradius", String(GEOSearch_RADIUS_METERS));
  url.searchParams.set("gslimit", String(limit));
  url.searchParams.set("gssort", "distance");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaGeoSearchResponse;
  return data.query?.geosearch?.map((item) => item.title.trim()) ?? [];
}

async function fetchLinksFromListPage(
  listPageTitle: string,
  limit: number,
): Promise<string[]> {
  await sleep(WIKI_REQUEST_GAP_MS);

  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", listPageTitle.replace(/ /g, "_"));
  url.searchParams.set("prop", "links");
  url.searchParams.set("plnamespace", "0");
  url.searchParams.set("pllimit", String(Math.min(limit, 50)));
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { headers: wikiHeaders() });
  if (!response.ok) return [];

  const data = (await response.json()) as WikipediaLinksResponse;
  const pages = data.query?.pages;
  if (!pages) return [];

  const page = Object.values(pages)[0];
  if (!page || !("links" in page) || !page.links) return [];

  return page.links
    .map((link: { title: string }) => link.title.trim())
    .filter(
      (title: string) => title.length > 0 && !title.startsWith("List of "),
    );
}

async function collectLandmarkTitles(
  countryName: string,
  context: LandmarksCountryContext,
): Promise<string[]> {
  const capital = normalizeCapital(context.capital);
  const seen = new Set<string>();
  const ordered: string[] = [];
  const listPagesToExpand: string[] = [];

  const addTitle = (title: string, fromListPage = false) => {
    const trimmed = title.trim();
    if (!trimmed || seen.has(trimmed)) return;
    if (isExcludedTopicTitle(trimmed)) return;

    if (isCountryListPage(trimmed, countryName)) {
      listPagesToExpand.push(trimmed);
      return;
    }

    if (!fromListPage && !isRelevantTitle(trimmed, countryName)) return;

    seen.add(trimmed);
    ordered.push(trimmed);
  };

  for (const query of buildSearchQueries(countryName, capital)) {
    const titles = await wikipediaSearchTitles(query, 8);
    for (const title of titles) addTitle(title);
    if (ordered.length >= MAX_TITLE_CANDIDATES) break;
  }

  for (const listPage of listPagesToExpand) {
    const linked = await fetchLinksFromListPage(listPage, 30);
    for (const title of linked) {
      addTitle(title, true);
      if (ordered.length >= MAX_TITLE_CANDIDATES) break;
    }
    if (ordered.length >= MAX_TITLE_CANDIDATES) break;
  }

  const [lat, lng] = context.latlng ?? [];
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    ordered.length < MAX_TITLE_CANDIDATES
  ) {
    const geoTitles = await wikipediaGeoSearchTitles(
      lat,
      lng,
      MAX_TITLE_CANDIDATES,
    );
    for (const title of geoTitles) addTitle(title);
  }

  return ordered.slice(0, MAX_TITLE_CANDIDATES);
}

async function fetchLandmarkSummary(
  title: string,
): Promise<CountryLandmark | null> {
  await sleep(WIKI_REQUEST_GAP_MS);

  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slugifyTitle(title)}`,
    { headers: wikiHeaders() },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as WikipediaRestSummary;
  const name = data.title?.trim() || title;
  const description =
    data.description?.trim() ||
    data.extract?.trim().split(". ")[0]?.trim() ||
    "";

  if (!description) return null;

  return {
    id: landmarkId(name),
    name,
    description: trimDescription(description),
    imageUrl: data.thumbnail?.source?.trim() || null,
  };
}

async function fetchLandmarksForCountry(
  countryName: string,
  imageFallbacks: string[] = [],
  context: LandmarksCountryContext = {},
): Promise<CountryLandmark[]> {
  const capital = normalizeCapital(context.capital);
  const mentionTerms = getMentionTerms(countryName, capital);
  const titles = await collectLandmarkTitles(countryName, context);
  const landmarks: CountryLandmark[] = [];

  for (const title of titles) {
    const landmark = await fetchLandmarkSummary(title);
    if (!landmark) continue;
    if (!isRelevantLandmark(landmark, mentionTerms)) continue;

    landmarks.push(landmark);
    if (landmarks.length >= MAX_LANDMARKS) break;
  }

  if (landmarks.length > 0) {
    for (let i = 0; i < landmarks.length; i += 1) {
      if (!landmarks[i].imageUrl && imageFallbacks[i]) {
        landmarks[i] = {
          ...landmarks[i],
          imageUrl: imageFallbacks[i],
        };
      }
    }
    return landmarks;
  }

  logger.info("No country-specific landmarks found", {
    country: countryName,
    candidateCount: titles.length,
  });
  return [];
}

export async function getLandmarksForCountry(
  countryName: string,
  imageFallbacks: string[] = [],
  context: LandmarksCountryContext = {},
): Promise<CountryLandmark[]> {
  const key = cacheKeys.landmarks(countryName);

  return getOrSet(key, CACHE_TTL.landmarks, () =>
    fetchLandmarksForCountry(countryName, imageFallbacks, context),
  );
}
