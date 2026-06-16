import type { CountryLandmark } from "../types/landmarks.js";

const MAX_DESCRIPTION_LENGTH = 140;

export function parseLandmarkYearBuilt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const signedMatch = trimmed.match(/^([+-]?\d{1,4})/);
  if (!signedMatch) return null;

  const year = Number.parseInt(signedMatch[1], 10);
  if (!Number.isFinite(year) || year <= 0 || year > 9999) return null;

  return year;
}

export function landmarkId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function capitalizeFirstLetter(text: string): string {
  if (!text) return text;
  const first = text.charAt(0);
  if (first === first.toUpperCase()) return text;
  return first.toUpperCase() + text.slice(1);
}

export function trimDescription(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return normalized;

  if (normalized.length <= MAX_DESCRIPTION_LENGTH) {
    return capitalizeFirstLetter(normalized);
  }

  const slice = normalized.slice(0, MAX_DESCRIPTION_LENGTH);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 60 ? slice.slice(0, lastSpace) : slice;
  return capitalizeFirstLetter(`${trimmed}…`);
}

export function normalizeLandmarkName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type LandmarkCountryBounds = {
  cca2: string;
  countryName: string;
  capital?: string;
  latlng?: [number, number];
  area?: number;
};

const FRENCH_OVERSEAS_TERRITORIES = new Set([
  "GF",
  "GP",
  "MQ",
  "RE",
  "YT",
  "PM",
  "BL",
  "MF",
  "WF",
  "NC",
  "PF",
]);

const NON_LANDMARK_NAME_PATTERNS = [
  /pandemic/i,
  /covid/i,
  /election/i,
  /crisis in/i,
  /war in/i,
];

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function namesAreSimilar(a: string, b: string): boolean {
  const left = normalizeLandmarkName(a);
  const right = normalizeLandmarkName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(left.split(" ").filter((t) => t.length > 2));
  const rightTokens = new Set(right.split(" ").filter((t) => t.length > 2));
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  const ratio = overlap / Math.min(leftTokens.size, rightTokens.size);
  return ratio >= 0.6;
}

export function landmarksAreDuplicate(
  a: CountryLandmark,
  b: CountryLandmark,
): boolean {
  if (namesAreSimilar(a.name, b.name)) return true;

  if (
    a.latitude !== null &&
    a.longitude !== null &&
    b.latitude !== null &&
    b.longitude !== null
  ) {
    const distance = haversineKm(
      a.latitude,
      a.longitude,
      b.latitude,
      b.longitude,
    );
    if (distance < 0.5 && namesAreSimilar(a.name, b.name)) return true;
    if (distance < 0.15) return true;
  }

  return false;
}

export function isUnescoWorldHeritageSite(
  heritageLabel: string | null,
): boolean {
  return (heritageLabel?.toLowerCase() ?? "").includes("world heritage");
}

export function mapWikidataType(instanceLabel: string | null): string {
  const instance = instanceLabel?.toLowerCase() ?? "";
  if (instance.includes("castle") || instance.includes("fortress"))
    return "Castle";
  if (instance.includes("museum")) return "Museum";
  if (instance.includes("monument")) return "Monument";
  if (instance.includes("park") || instance.includes("national park"))
    return "National park";
  if (
    instance.includes("church") ||
    instance.includes("cathedral") ||
    instance.includes("temple") ||
    instance.includes("mosque") ||
    instance.includes("shrine")
  ) {
    return "Religious landmark";
  }
  if (
    instance.includes("mountain") ||
    instance.includes("lake") ||
    instance.includes("river") ||
    instance.includes("waterfall") ||
    instance.includes("island")
  ) {
    return "Natural wonder";
  }
  if (instance.includes("historic") || instance.includes("archaeological"))
    return "Historic site";
  if (instance.includes("building") || instance.includes("palace"))
    return "Famous building";

  return "Tourist attraction";
}

export function mapOsmType(tags: Record<string, string>): string {
  if (tags.tourism === "museum") return "Museum";
  if (tags.historic) {
    const value = tags.historic.replace(/_/g, " ");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  if (tags.natural) {
    const value = tags.natural.replace(/_/g, " ");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  if (tags.leisure === "park") return "National park";
  if (tags.tourism === "attraction") return "Tourist attraction";
  return "Tourist attraction";
}

export function landmarkRankScore(landmark: CountryLandmark): number {
  const type = landmark.type.toLowerCase();
  const description = landmark.description.toLowerCase();
  let score = 40;

  if (
    landmark.isUnescoWorldHeritage ||
    type.includes("unesco") ||
    description.includes("world heritage")
  )
    score = 100;
  else if (type.includes("castle") || type.includes("fortress")) score = 88;
  else if (type.includes("national") && type.includes("landmark")) score = 85;
  else if (type.includes("museum")) score = 75;
  else if (type.includes("monument")) score = 72;
  else if (type.includes("historic")) score = 68;
  else if (type.includes("religious")) score = 66;
  else if (type.includes("natural") || type.includes("park")) score = 62;
  else if (type.includes("building") || type.includes("palace")) score = 58;
  else if (type.includes("tourist")) score = 50;
  else if (landmark.source === "wikidata") score = 48;
  else if (landmark.source === "osm") score = 42;

  if (landmark.imageUrl) score += 4;
  if (landmark.latitude !== null && landmark.longitude !== null) score += 2;

  return score;
}

export function sortLandmarksByRank(
  landmarks: CountryLandmark[],
): CountryLandmark[] {
  return [...landmarks].sort(
    (a, b) => landmarkRankScore(b) - landmarkRankScore(a),
  );
}

export function dedupeLandmarks(
  landmarks: CountryLandmark[],
): CountryLandmark[] {
  const result: CountryLandmark[] = [];

  for (const candidate of landmarks) {
    const duplicate = result.some((existing) =>
      landmarksAreDuplicate(existing, candidate),
    );
    if (!duplicate) result.push(candidate);
  }

  return result;
}

export function mergeLandmarkLists(
  ...lists: CountryLandmark[][]
): CountryLandmark[] {
  const merged: CountryLandmark[] = [];
  for (const list of lists) {
    for (const landmark of list) {
      const duplicate = merged.some((existing) =>
        landmarksAreDuplicate(existing, landmark),
      );
      if (!duplicate) merged.push(landmark);
    }
  }
  return merged;
}

function maxLandmarkDistanceKm(area?: number): number {
  if (!area || area <= 0) return 800;
  const equivalentRadius = Math.sqrt(area / Math.PI);
  const scaled = equivalentRadius * 2.75;
  return Math.min(3200, Math.max(200, scaled));
}

function isMisassignedCountryPage(
  landmark: CountryLandmark,
  bounds: LandmarkCountryBounds,
): boolean {
  const code = bounds.cca2.trim().toUpperCase();
  const normalizedName = normalizeLandmarkName(landmark.name);
  const normalizedCountry = normalizeLandmarkName(bounds.countryName);

  if (normalizedName === normalizedCountry) return false;

  if (FRENCH_OVERSEAS_TERRITORIES.has(code)) {
    if (normalizedName === "france" || normalizedName === "paris") return true;
    if (normalizedName === "french republic") return true;
  }

  for (const pattern of NON_LANDMARK_NAME_PATTERNS) {
    if (pattern.test(landmark.name)) return true;
  }

  return false;
}

export function isLandmarkWithinCountry(
  landmark: CountryLandmark,
  bounds: LandmarkCountryBounds,
): boolean {
  if (isMisassignedCountryPage(landmark, bounds)) return false;

  // SPARQL already scopes Wikidata rows to the target country (P17 / P131).
  if (landmark.source === "wikidata") {
    return true;
  }

  const [centerLat, centerLng] = bounds.latlng ?? [];
  if (typeof centerLat !== "number" || typeof centerLng !== "number") {
    return landmark.source !== "wikipedia";
  }

  const maxDistanceKm = maxLandmarkDistanceKm(bounds.area);

  if (landmark.latitude !== null && landmark.longitude !== null) {
    const distance = haversineKm(
      centerLat,
      centerLng,
      landmark.latitude,
      landmark.longitude,
    );
    return distance <= maxDistanceKm;
  }

  return landmark.source !== "wikipedia";
}

export function filterLandmarksByCountry(
  landmarks: CountryLandmark[],
  bounds: LandmarkCountryBounds,
): CountryLandmark[] {
  return landmarks.filter((landmark) =>
    isLandmarkWithinCountry(landmark, bounds),
  );
}
