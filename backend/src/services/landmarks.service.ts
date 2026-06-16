import type { CountryLandmark } from "../types/landmarks.js";
import {
  dedupeLandmarks,
  filterLandmarksByCountry,
  landmarkId,
  mergeLandmarkLists,
  sortLandmarksByRank,
  trimDescription,
  type LandmarkCountryBounds,
} from "../utils/landmark-ranking.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL, cacheKeys, getOrSet } from "./cache.service.js";
import { fetchOsmLandmarks } from "./osm.service.js";
import { fetchWikidataLandmarks } from "./wikidata.service.js";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIPEDIA_USER_AGENT =
  "WorldLoop/1.0 (country landmarks service; learning project)";

const MIN_LANDMARKS = 3;
const MAX_LANDMARKS = 5;
const WIKI_REQUEST_GAP_MS = 120;

export type LandmarksCountryContext = {
  cca2: string;
  countryName: string;
  capital?: string;
  latlng?: [number, number];
  area?: number;
};

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{ title: string }>;
  };
};

type WikipediaRestSummary = {
  title?: string;
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
  coordinates?: { lat?: number; lon?: number };
};

function wikiHeaders(): HeadersInit {
  return { "User-Agent": WIKIPEDIA_USER_AGENT };
}

function slugifyTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, "_"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyImageFallbacks(
  landmarks: CountryLandmark[],
  imageFallbacks: string[],
): CountryLandmark[] {
  return landmarks.map((landmark, index) => {
    if (landmark.imageUrl || !imageFallbacks[index]) return landmark;
    return { ...landmark, imageUrl: imageFallbacks[index] };
  });
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

async function fetchWikipediaLandmarkSummary(
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
    type: "Tourist attraction",
    description: trimDescription(description),
    latitude:
      typeof data.coordinates?.lat === "number" ? data.coordinates.lat : null,
    longitude:
      typeof data.coordinates?.lon === "number" ? data.coordinates.lon : null,
    imageUrl: data.thumbnail?.source?.trim() || null,
    source: "wikipedia",
  };
}

async function fetchWikipediaFallbackLandmarks(
  bounds: LandmarkCountryBounds,
  needed: number = MIN_LANDMARKS,
): Promise<CountryLandmark[]> {
  const { countryName, capital } = bounds;
  const queries: string[] = [];

  if (capital) {
    queries.push(
      `landmarks in ${capital} ${countryName}`,
      `tourist attractions in ${capital}`,
      `historic sites in ${capital}`,
    );
  }

  queries.push(
    `famous landmarks in ${countryName}`,
    `UNESCO World Heritage Sites in ${countryName}`,
    `tourist attractions in ${countryName}`,
  );

  const seen = new Set<string>();
  const titles: string[] = [];

  for (const query of queries) {
    const results = await wikipediaSearchTitles(query, 6);
    for (const title of results) {
      if (seen.has(title)) continue;
      seen.add(title);
      titles.push(title);
      if (titles.length >= needed + 4) break;
    }
    if (titles.length >= needed + 4) break;
  }

  const landmarks: CountryLandmark[] = [];
  for (const title of titles) {
    const landmark = await fetchWikipediaLandmarkSummary(title);
    if (!landmark) continue;
    if (!filterLandmarksByCountry([landmark], bounds).length) continue;
    landmarks.push(landmark);
    if (landmarks.length >= needed) break;
  }

  return landmarks;
}

function toLandmarkBounds(
  context: LandmarksCountryContext,
): LandmarkCountryBounds {
  return {
    cca2: context.cca2,
    countryName: context.countryName,
    capital: context.capital,
    latlng: context.latlng,
    area: context.area,
  };
}

export async function fetchLandmarksForCountry(
  countryName: string,
  imageFallbacks: string[] = [],
  context: LandmarksCountryContext,
): Promise<CountryLandmark[]> {
  const cca2 = context.cca2.trim().toUpperCase();
  const bounds = toLandmarkBounds({
    ...context,
    countryName: context.countryName || countryName,
  });

  const wikidataLandmarks = sortLandmarksByRank(
    dedupeLandmarks(
      filterLandmarksByCountry(await fetchWikidataLandmarks(cca2), bounds),
    ),
  );

  let merged = wikidataLandmarks.slice(0, MAX_LANDMARKS);
  let osmCount = 0;

  if (merged.length < MIN_LANDMARKS) {
    const osmLandmarks = sortLandmarksByRank(
      dedupeLandmarks(
        filterLandmarksByCountry(
          await fetchOsmLandmarks(cca2, context.latlng),
          bounds,
        ),
      ),
    );
    osmCount = osmLandmarks.length;
    merged = mergeLandmarkLists(merged, osmLandmarks).slice(0, MAX_LANDMARKS);
  }

  if (merged.length < MIN_LANDMARKS) {
    const wikipediaLandmarks = await fetchWikipediaFallbackLandmarks(
      bounds,
      MIN_LANDMARKS,
    );
    merged = mergeLandmarkLists(merged, wikipediaLandmarks).slice(
      0,
      MAX_LANDMARKS,
    );
  }

  merged = filterLandmarksByCountry(
    sortLandmarksByRank(dedupeLandmarks(merged)),
    bounds,
  ).slice(0, MAX_LANDMARKS);
  merged = applyImageFallbacks(merged, imageFallbacks);

  const wikidataCount = merged.filter((l) => l.source === "wikidata").length;
  const osmUsed = merged.filter((l) => l.source === "osm").length;

  logger.info("Landmarks pipeline complete", {
    country: countryName,
    cca2,
    wikidata: wikidataCount,
    osm: osmUsed,
    osmFetched: osmCount,
    total: merged.length,
  });

  return merged;
}

export async function getLandmarksForCountry(
  countryName: string,
  imageFallbacks: string[] = [],
  context: LandmarksCountryContext,
): Promise<CountryLandmark[]> {
  const cca2 = context.cca2.trim().toUpperCase();
  const key = cacheKeys.landmarks(cca2);

  return getOrSet(key, CACHE_TTL.landmarks, () =>
    fetchLandmarksForCountry(countryName, imageFallbacks, context),
  );
}
