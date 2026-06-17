import type { CountryLandmark } from "../types/landmarks.js";
import {
  landmarkId,
  mapOsmType,
  parseLandmarkYearBuilt,
  trimDescription,
} from "../utils/landmark-ranking.js";
import { logger } from "../utils/logger.js";

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "WorldLoop/1.0 (landmarks service; learning project)";
const OVERPASS_TIMEOUT_MS = 25_000;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const EXCLUDED_TAG_PREFIXES = ["shop:", "office:"] as const;
const EXCLUDED_TAG_VALUES: Array<[string, string]> = [
  ["tourism", "hotel"],
  ["tourism", "guest_house"],
  ["tourism", "hostel"],
  ["amenity", "restaurant"],
  ["amenity", "cafe"],
  ["amenity", "fast_food"],
];

function overpassUrl(): string {
  return process.env.OVERPASS_API_URL?.trim() || DEFAULT_OVERPASS_URL;
}

function buildAreaQuery(cca2: string): string {
  const code = cca2.trim().toUpperCase();
  return `
[out:json][timeout:25];
area["ISO3166-1"="${code}"]->.country;
(
  node["name"]["tourism"="attraction"](area.country);
  node["name"]["tourism"="museum"](area.country);
  node["name"]["historic"](area.country);
  node["name"]["natural"](area.country);
  node["name"]["leisure"="park"](area.country);
  way["name"]["tourism"="attraction"](area.country);
  way["name"]["tourism"="museum"](area.country);
  way["name"]["historic"](area.country);
  way["name"]["natural"](area.country);
  way["name"]["leisure"="park"](area.country);
);
out center 40;
`.trim();
}

function buildBboxQuery(
  lat: number,
  lng: number,
  radiusMeters: number,
): string {
  return `
[out:json][timeout:25];
(
  node["name"]["tourism"="attraction"](around:${radiusMeters},${lat},${lng});
  node["name"]["tourism"="museum"](around:${radiusMeters},${lat},${lng});
  node["name"]["historic"](around:${radiusMeters},${lat},${lng});
  node["name"]["natural"](around:${radiusMeters},${lat},${lng});
  node["name"]["leisure"="park"](around:${radiusMeters},${lat},${lng});
  way["name"]["tourism"="attraction"](around:${radiusMeters},${lat},${lng});
  way["name"]["tourism"="museum"](around:${radiusMeters},${lat},${lng});
  way["name"]["historic"](around:${radiusMeters},${lat},${lng});
  way["name"]["natural"](around:${radiusMeters},${lat},${lng});
  way["name"]["leisure"="park"](around:${radiusMeters},${lat},${lng});
);
out center 40;
`.trim();
}

function isExcludedOsmElement(tags: Record<string, string>): boolean {
  for (const [key, value] of EXCLUDED_TAG_VALUES) {
    if (tags[key] === value) return true;
  }

  for (const key of Object.keys(tags)) {
    for (const prefix of EXCLUDED_TAG_PREFIXES) {
      if (key.startsWith(prefix)) return true;
    }
  }

  return false;
}

function parseOsmCity(tags: Record<string, string>): string | null {
  for (const key of ["addr:city", "is_in:city", "addr:place"]) {
    const value = tags[key]?.trim();
    if (value) return value;
  }

  return null;
}

function parseOsmYearBuilt(tags: Record<string, string>): number | null {
  for (const key of [
    "start_date",
    "building:year",
    "construction_date",
    "year",
  ]) {
    const value = tags[key]?.trim();
    if (!value) continue;
    const year = parseLandmarkYearBuilt(value);
    if (year !== null) return year;
  }

  return null;
}

function elementToLandmark(element: OverpassElement): CountryLandmark | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;
  if (isExcludedOsmElement(tags)) return null;

  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const type = mapOsmType(tags);
  const description = trimDescription(
    tags.description?.trim()
      ? tags.description.trim()
      : `${name} is a notable ${type.toLowerCase()} in the area.`,
  );

  return {
    id: landmarkId(name),
    name,
    type,
    description,
    latitude: lat,
    longitude: lon,
    imageUrl: null,
    source: "osm",
    yearBuilt: parseOsmYearBuilt(tags),
    city: parseOsmCity(tags),
  };
}

async function runOverpassQuery(
  query: string,
  cca2: string,
): Promise<CountryLandmark[]> {
  try {
    const response = await fetch(overpassUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn("Overpass API request failed", {
        cca2,
        status: response.status,
      });
      return [];
    }

    const data = (await response.json()) as OverpassResponse;
    const landmarks: CountryLandmark[] = [];

    for (const element of data.elements ?? []) {
      const landmark = elementToLandmark(element);
      if (landmark) landmarks.push(landmark);
    }

    return landmarks;
  } catch (error) {
    logger.warn("Overpass landmarks fetch error", {
      cca2,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function fetchOsmLandmarks(
  cca2: string,
  latlng?: [number, number],
): Promise<CountryLandmark[]> {
  const code = cca2.trim().toUpperCase();
  if (code.length !== 2) return [];

  let landmarks = await runOverpassQuery(buildAreaQuery(code), code);

  if (landmarks.length < 3 && latlng) {
    const [lat, lng] = latlng;
    if (typeof lat === "number" && typeof lng === "number") {
      const radius =
        code === "VA" || code === "MC" || code === "SM" ? 25000 : 80000;
      const bboxLandmarks = await runOverpassQuery(
        buildBboxQuery(lat, lng, radius),
        code,
      );
      landmarks = [...landmarks, ...bboxLandmarks];
    }
  }

  logger.info("OSM landmarks fetched", {
    cca2: code,
    count: landmarks.length,
  });

  return landmarks;
}
