import type { CountryLandmark } from "../types/landmarks.js";
import {
  isUnescoWorldHeritageSite,
  landmarkId,
  mapWikidataType,
  parseLandmarkYearBuilt,
  trimDescription,
} from "../utils/landmark-ranking.js";
import { logger } from "../utils/logger.js";

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT = "WorldLoop/1.0 (landmarks service; learning project)";

type SparqlBinding = Record<
  string,
  { value: string; type?: string } | undefined
>;

type SparqlResponse = {
  results?: {
    bindings?: SparqlBinding[];
  };
};

const DIRECT_INSTANCE_TYPES = [
  "wd:Q570116", // tourist attraction
  "wd:Q41176", // building
  "wd:Q33506", // museum
  "wd:Q839954", // archaeological site
  "wd:Q23413", // castle
  "wd:Q4989906", // monument
  "wd:Q46169", // park
  "wd:Q8502", // mountain
  "wd:Q16970", // church building
  "wd:Q2977", // cathedral
  "wd:Q44539", // temple
  "wd:Q40080", // fortress
  "wd:Q16560", // palace
];

const WIKIDATA_TIMEOUT_MS = 22_000;

function buildHeritageQuery(cca2: string): string {
  const code = cca2.trim().toUpperCase();

  return `
SELECT DISTINCT ?item ?itemLabel ?description ?coord ?image ?instanceLabel ?heritageLabel ?inception ?locationLabel WHERE {
  ?country wdt:P297 "${code}" .
  ?item wdt:P17 ?country .
  ?item wdt:P625 ?coord .
  ?item wdt:P1435 ?heritage .

  OPTIONAL {
    ?item schema:description ?description .
    FILTER(LANG(?description) = "en")
  }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL {
    ?item wdt:P131 ?location .
    ?location rdfs:label ?locationLabel .
    FILTER(LANG(?locationLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P31 ?instance .
    ?instance rdfs:label ?instanceLabel .
    FILTER(LANG(?instanceLabel) = "en")
  }
  OPTIONAL {
    ?heritage rdfs:label ?heritageLabel .
    FILTER(LANG(?heritageLabel) = "en")
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 25
`.trim();
}

function buildTypedLandmarksQuery(cca2: string): string {
  const code = cca2.trim().toUpperCase();
  const typeValues = DIRECT_INSTANCE_TYPES.join(" ");

  return `
SELECT DISTINCT ?item ?itemLabel ?description ?coord ?image ?instanceLabel ?heritageLabel ?inception ?locationLabel WHERE {
  ?country wdt:P297 "${code}" .
  ?item wdt:P17 ?country .
  ?item wdt:P625 ?coord .

  {
    ?item wdt:P31 ?instance .
    VALUES ?instance { ${typeValues} }
  } UNION {
    ?item wdt:P31/wdt:P279* wd:Q23413 .
  } UNION {
    ?item wdt:P31/wdt:P279* wd:Q570116 .
  }

  OPTIONAL {
    ?item schema:description ?description .
    FILTER(LANG(?description) = "en")
  }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL {
    ?item wdt:P131 ?location .
    ?location rdfs:label ?locationLabel .
    FILTER(LANG(?locationLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P31 ?instance .
    ?instance rdfs:label ?instanceLabel .
    FILTER(LANG(?instanceLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P1435 ?heritage .
    ?heritage rdfs:label ?heritageLabel .
    FILTER(LANG(?heritageLabel) = "en")
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 35
`.trim();
}

/** Territories where POIs use P131 (located in) more than P17 (country). */
function buildLocatedInTypedQuery(cca2: string): string {
  const code = cca2.trim().toUpperCase();
  const typeValues = DIRECT_INSTANCE_TYPES.join(" ");

  return `
SELECT DISTINCT ?item ?itemLabel ?description ?coord ?image ?instanceLabel ?heritageLabel ?inception ?locationLabel WHERE {
  ?country wdt:P297 "${code}" .
  ?item wdt:P131 ?country .
  ?item wdt:P625 ?coord .

  {
    ?item wdt:P31 ?instance .
    VALUES ?instance { ${typeValues} }
  } UNION {
    ?item wdt:P31/wdt:P279* wd:Q23413 .
  } UNION {
    ?item wdt:P31/wdt:P279* wd:Q570116 .
  }

  OPTIONAL {
    ?item schema:description ?description .
    FILTER(LANG(?description) = "en")
  }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL {
    ?item wdt:P131 ?location .
    ?location rdfs:label ?locationLabel .
    FILTER(LANG(?locationLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P31 ?instance .
    ?instance rdfs:label ?instanceLabel .
    FILTER(LANG(?instanceLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P1435 ?heritage .
    ?heritage rdfs:label ?heritageLabel .
    FILTER(LANG(?heritageLabel) = "en")
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 35
`.trim();
}

/** Last resort — any geolocated row in country with an image or heritage tag. */
function buildBroadCountryQuery(cca2: string): string {
  const code = cca2.trim().toUpperCase();

  return `
SELECT DISTINCT ?item ?itemLabel ?description ?coord ?image ?instanceLabel ?heritageLabel ?inception ?locationLabel WHERE {
  ?country wdt:P297 "${code}" .
  ?item wdt:P17 ?country .
  ?item wdt:P625 ?coord .

  {
    ?item wdt:P18 ?image .
  } UNION {
    ?item wdt:P1435 ?heritage .
  }

  OPTIONAL {
    ?item schema:description ?description .
    FILTER(LANG(?description) = "en")
  }
  OPTIONAL { ?item wdt:P571 ?inception . }
  OPTIONAL {
    ?item wdt:P131 ?location .
    ?location rdfs:label ?locationLabel .
    FILTER(LANG(?locationLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P31 ?instance .
    ?instance rdfs:label ?instanceLabel .
    FILTER(LANG(?instanceLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P1435 ?heritage .
    ?heritage rdfs:label ?heritageLabel .
    FILTER(LANG(?heritageLabel) = "en")
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 25
`.trim();
}

function parseWikidataPoint(value: string): {
  latitude: number;
  longitude: number;
} | null {
  const match = value.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/i);
  if (!match) return null;

  const longitude = Number.parseFloat(match[1]);
  const latitude = Number.parseFloat(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

export function resolveCommonsImageUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const fileName = trimmed
    .replace(/^File:/i, "")
    .replace(/ /g, "_")
    .trim();

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=640`;
}

function isUsableLandmarkName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (/^Q\d+$/i.test(trimmed)) return false;
  if (/^http:\/\//i.test(trimmed) || /^www\.wikidata\.org/i.test(trimmed)) {
    return false;
  }
  return true;
}

function bindingToLandmark(binding: SparqlBinding): CountryLandmark | null {
  const name = binding.itemLabel?.value?.trim();
  if (!name || !isUsableLandmarkName(name)) return null;

  const coords = binding.coord?.value
    ? parseWikidataPoint(binding.coord.value)
    : null;

  const instanceLabel = binding.instanceLabel?.value?.trim() ?? null;
  const heritageLabel = binding.heritageLabel?.value?.trim() ?? null;
  const type = mapWikidataType(instanceLabel);
  const isUnescoWorldHeritage = isUnescoWorldHeritageSite(heritageLabel);

  const rawDescription = binding.description?.value?.trim() ?? "";
  const description = rawDescription
    ? trimDescription(rawDescription)
    : trimDescription(`${name} — ${type} in the region.`);

  const imageRaw = binding.image?.value?.trim() ?? "";
  const imageUrl = imageRaw ? resolveCommonsImageUrl(imageRaw) : null;
  const inceptionRaw = binding.inception?.value?.trim() ?? "";
  const yearBuilt = inceptionRaw ? parseLandmarkYearBuilt(inceptionRaw) : null;
  const city = binding.locationLabel?.value?.trim() || null;

  return {
    id: landmarkId(name),
    name,
    type,
    description,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    imageUrl,
    source: "wikidata",
    yearBuilt,
    city,
    ...(isUnescoWorldHeritage ? { isUnescoWorldHeritage: true } : {}),
  };
}

async function runSparqlQuery(
  query: string,
  cca2: string,
  label: string,
): Promise<CountryLandmark[]> {
  const url = new URL(WIKIDATA_SPARQL);
  url.searchParams.set("format", "json");
  url.searchParams.set("query", query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(WIKIDATA_TIMEOUT_MS),
  });

  if (!response.ok) {
    logger.warn("Wikidata SPARQL request failed", {
      cca2,
      label,
      status: response.status,
    });
    return [];
  }

  const data = (await response.json()) as SparqlResponse;
  const landmarks: CountryLandmark[] = [];

  for (const binding of data.results?.bindings ?? []) {
    const landmark = bindingToLandmark(binding);
    if (landmark) landmarks.push(landmark);
  }

  return landmarks;
}

function mergeUniqueLandmarks(
  target: CountryLandmark[],
  incoming: CountryLandmark[],
  seen: Set<string>,
  max = 35,
): void {
  for (const landmark of incoming) {
    if (seen.has(landmark.id)) continue;
    seen.add(landmark.id);
    target.push(landmark);
    if (target.length >= max) break;
  }
}

export async function fetchWikidataLandmarks(
  cca2: string,
): Promise<CountryLandmark[]> {
  const code = cca2.trim().toUpperCase();
  if (code.length !== 2) return [];

  try {
    const heritage = await runSparqlQuery(
      buildHeritageQuery(code),
      code,
      "heritage",
    );

    const seen = new Set(heritage.map((landmark) => landmark.id));
    let landmarks = [...heritage];

    if (landmarks.length < 5) {
      const typed = await runSparqlQuery(
        buildTypedLandmarksQuery(code),
        code,
        "typed",
      );
      mergeUniqueLandmarks(landmarks, typed, seen);
    }

    if (landmarks.length < 5) {
      const locatedIn = await runSparqlQuery(
        buildLocatedInTypedQuery(code),
        code,
        "located-in",
      );
      mergeUniqueLandmarks(landmarks, locatedIn, seen);
    }

    if (landmarks.length < 3) {
      const broad = await runSparqlQuery(
        buildBroadCountryQuery(code),
        code,
        "broad",
      );
      mergeUniqueLandmarks(landmarks, broad, seen);
    }

    logger.info("Wikidata landmarks fetched", {
      cca2: code,
      count: landmarks.length,
    });

    return landmarks;
  } catch (error) {
    logger.warn("Wikidata landmarks fetch error", {
      cca2: code,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
