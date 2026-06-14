import type { StaticCountryCatalog } from "../../types/country-catalog.js";
import {
  MAX_PROFILE_LANDMARKS,
  MIN_ENRICHED_PROFILE_RATIO,
  MIN_PROFILE_LANDMARKS,
  PROFILE_CATALOG_VERSION,
  type CountryProfileEntry,
  type StaticCountryProfileCatalog,
} from "../../types/country-profile-catalog.js";

const VALID_LANDMARK_SOURCES = new Set(["wikidata", "osm", "wikipedia"]);

export type ProfileValidationIssue = {
  path: string;
  message: string;
  severity: "error" | "warn";
};

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isProfileEntryEnriched(entry: CountryProfileEntry): boolean {
  return Boolean(
    entry.wikipedia?.extract?.trim() || (entry.landmarks?.length ?? 0) > 0,
  );
}

function validateWikipedia(
  wikipedia: CountryProfileEntry["wikipedia"],
  prefix: string,
): ProfileValidationIssue[] {
  const issues: ProfileValidationIssue[] = [];
  if (!wikipedia) return issues;

  if (!wikipedia.title?.trim()) {
    issues.push({
      path: `${prefix}.wikipedia`,
      message: "missing title",
      severity: "error",
    });
  }
  if (!wikipedia.extract?.trim()) {
    issues.push({
      path: `${prefix}.wikipedia`,
      message: "missing extract",
      severity: "error",
    });
  }
  if (!wikipedia.pageUrl?.trim() || !isHttpsUrl(wikipedia.pageUrl)) {
    issues.push({
      path: `${prefix}.wikipedia.pageUrl`,
      message: "pageUrl must be a valid https URL",
      severity: "error",
    });
  }
  if (wikipedia.thumbnailUrl && !isHttpsUrl(wikipedia.thumbnailUrl)) {
    issues.push({
      path: `${prefix}.wikipedia.thumbnailUrl`,
      message: "thumbnailUrl must be https when present",
      severity: "error",
    });
  }

  return issues;
}

function validateLandmark(
  landmark: CountryProfileEntry["landmarks"][number],
  prefix: string,
): ProfileValidationIssue[] {
  const issues: ProfileValidationIssue[] = [];

  if (!landmark.id?.trim()) {
    issues.push({ path: prefix, message: "missing id", severity: "error" });
  }
  if (!landmark.name?.trim()) {
    issues.push({ path: prefix, message: "missing name", severity: "error" });
  }
  if (!landmark.type?.trim()) {
    issues.push({ path: prefix, message: "missing type", severity: "error" });
  }
  if (!landmark.description?.trim()) {
    issues.push({
      path: prefix,
      message: "missing description",
      severity: "error",
    });
  }
  if (!VALID_LANDMARK_SOURCES.has(landmark.source)) {
    issues.push({
      path: `${prefix}.source`,
      message: `invalid source "${landmark.source}"`,
      severity: "error",
    });
  }
  if (landmark.imageUrl && !isHttpsUrl(landmark.imageUrl)) {
    issues.push({
      path: `${prefix}.imageUrl`,
      message: "imageUrl must be https when present",
      severity: "error",
    });
  }

  return issues;
}

function validateEntry(
  entry: CountryProfileEntry,
  index: number,
  catalogByName: Map<string, { cca2: string }>,
): ProfileValidationIssue[] {
  const issues: ProfileValidationIssue[] = [];
  const prefix = `profiles[${index}] (${entry.name || "unknown"})`;

  if (!entry.name?.trim()) {
    issues.push({ path: prefix, message: "missing name", severity: "error" });
    return issues;
  }

  const catalogRow = catalogByName.get(entry.name.trim().toLowerCase());
  if (!catalogRow) {
    issues.push({
      path: prefix,
      message: `name not found in countries.json`,
      severity: "error",
    });
  } else if (
    entry.cca2?.trim().toLowerCase() !== catalogRow.cca2.trim().toLowerCase()
  ) {
    issues.push({
      path: prefix,
      message: `cca2 mismatch (profile "${entry.cca2}" vs catalog "${catalogRow.cca2}")`,
      severity: "error",
    });
  }

  if (!entry.cca2?.trim() || entry.cca2.trim().length !== 2) {
    issues.push({ path: prefix, message: "invalid cca2", severity: "error" });
  }

  const landmarkCount = entry.landmarks?.length ?? 0;
  if (
    landmarkCount < MIN_PROFILE_LANDMARKS ||
    landmarkCount > MAX_PROFILE_LANDMARKS
  ) {
    issues.push({
      path: prefix,
      message: `landmarks.length must be ${MIN_PROFILE_LANDMARKS}-${MAX_PROFILE_LANDMARKS}, got ${landmarkCount}`,
      severity: "error",
    });
  }

  issues.push(...validateWikipedia(entry.wikipedia, prefix));

  for (const [landmarkIndex, landmark] of (entry.landmarks ?? []).entries()) {
    issues.push(
      ...validateLandmark(landmark, `${prefix}.landmarks[${landmarkIndex}]`),
    );
  }

  if (!isProfileEntryEnriched(entry)) {
    issues.push({
      path: prefix,
      message: "no wikipedia extract or landmarks",
      severity: "warn",
    });
  }

  return issues;
}

export function validateStaticCountryProfileCatalog(
  catalog: StaticCountryProfileCatalog,
  countriesCatalog: StaticCountryCatalog,
  options?: { minEnrichedRatio?: number },
): ProfileValidationIssue[] {
  const issues: ProfileValidationIssue[] = [];
  const minRatio = options?.minEnrichedRatio ?? MIN_ENRICHED_PROFILE_RATIO;

  if (catalog.version !== PROFILE_CATALOG_VERSION) {
    issues.push({
      path: "version",
      message: `expected version ${PROFILE_CATALOG_VERSION}, got ${catalog.version}`,
      severity: "error",
    });
  }

  if (!catalog.generatedAt?.trim()) {
    issues.push({
      path: "generatedAt",
      message: "missing generatedAt",
      severity: "error",
    });
  }

  if (!Array.isArray(catalog.profiles)) {
    issues.push({
      path: "profiles",
      message: "profiles must be an array",
      severity: "error",
    });
    return issues;
  }

  if (catalog.count !== catalog.profiles.length) {
    issues.push({
      path: "count",
      message: `count (${catalog.count}) must equal profiles.length (${catalog.profiles.length})`,
      severity: "error",
    });
  }

  const catalogByName = new Map(
    countriesCatalog.countries.map((country) => [
      country.name.trim().toLowerCase(),
      { cca2: country.cca2 },
    ]),
  );

  const seenNames = new Set<string>();
  for (const [index, entry] of catalog.profiles.entries()) {
    const key = entry.name?.trim().toLowerCase();
    if (key) {
      if (seenNames.has(key)) {
        issues.push({
          path: `profiles[${index}]`,
          message: `duplicate name "${entry.name}"`,
          severity: "error",
        });
      }
      seenNames.add(key);
    }

    issues.push(...validateEntry(entry, index, catalogByName));
  }

  const enrichedCount = catalog.profiles.filter(isProfileEntryEnriched).length;
  const ratio =
    catalog.profiles.length > 0 ? enrichedCount / catalog.profiles.length : 0;

  if (ratio < minRatio) {
    issues.push({
      path: "profiles",
      message: `only ${(ratio * 100).toFixed(1)}% enriched (need ≥ ${(minRatio * 100).toFixed(0)}%)`,
      severity: "error",
    });
  }

  return issues;
}

export function assertValidStaticCountryProfileCatalog(
  catalog: StaticCountryProfileCatalog,
  countriesCatalog: StaticCountryCatalog,
): void {
  const issues = validateStaticCountryProfileCatalog(catalog, countriesCatalog);
  const errors = issues.filter((issue) => issue.severity === "error");

  if (errors.length > 0) {
    const summary = errors
      .slice(0, 10)
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("\n  - ");
    throw new Error(
      `Invalid country profile catalog (${errors.length} errors):\n  - ${summary}${errors.length > 10 ? "\n  …" : ""}`,
    );
  }
}
