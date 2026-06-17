import type { StaticCountryProfileCatalog } from "../../types/country-profile-catalog.js";
import {
  LANDMARK_DETAILS_CATALOG_VERSION,
  MIN_LANDMARK_DETAIL_ENRICHED_RATIO,
  type LandmarkDetailEntry,
  type StaticLandmarkDetailsCatalog,
} from "../../types/landmark-details-catalog.js";

export type LandmarkDetailsValidationIssue = {
  path: string;
  message: string;
  severity: "error" | "warn";
};

function collectProfileLandmarkIds(
  profiles: StaticCountryProfileCatalog,
): Map<string, { countryName: string; cca2: string; landmarkName: string }> {
  const ids = new Map<
    string,
    { countryName: string; cca2: string; landmarkName: string }
  >();

  for (const profile of profiles.profiles) {
    for (const landmark of profile.landmarks ?? []) {
      const id = landmark.id?.trim();
      if (!id) continue;
      ids.set(id, {
        countryName: profile.name,
        cca2: profile.cca2,
        landmarkName: landmark.name,
      });
    }
  }

  return ids;
}

function validateEntry(
  entry: LandmarkDetailEntry,
  prefix: string,
): LandmarkDetailsValidationIssue[] {
  const issues: LandmarkDetailsValidationIssue[] = [];

  if (!entry.countryName?.trim()) {
    issues.push({
      path: `${prefix}.countryName`,
      message: "missing countryName",
      severity: "error",
    });
  }
  if (!entry.cca2?.trim()) {
    issues.push({
      path: `${prefix}.cca2`,
      message: "missing cca2",
      severity: "error",
    });
  }
  if (!entry.landmarkName?.trim()) {
    issues.push({
      path: `${prefix}.landmarkName`,
      message: "missing landmarkName",
      severity: "error",
    });
  }
  if (!entry.ai?.fact?.trim()) {
    issues.push({
      path: `${prefix}.ai.fact`,
      message: "missing ai.fact",
      severity: "error",
    });
  }
  if (
    entry.ai?.city !== null &&
    entry.ai?.city !== undefined &&
    typeof entry.ai.city !== "string"
  ) {
    issues.push({
      path: `${prefix}.ai.city`,
      message: "ai.city must be string or null",
      severity: "error",
    });
  }

  return issues;
}

export function validateStaticLandmarkDetailsCatalog(
  catalog: StaticLandmarkDetailsCatalog,
  profiles: StaticCountryProfileCatalog,
): LandmarkDetailsValidationIssue[] {
  const issues: LandmarkDetailsValidationIssue[] = [];

  if (catalog.version !== LANDMARK_DETAILS_CATALOG_VERSION) {
    issues.push({
      path: "version",
      message: `expected version ${LANDMARK_DETAILS_CATALOG_VERSION}, got ${catalog.version}`,
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

  if (!catalog.entries || typeof catalog.entries !== "object") {
    issues.push({
      path: "entries",
      message: "entries must be an object",
      severity: "error",
    });
    return issues;
  }

  const profileLandmarks = collectProfileLandmarkIds(profiles);
  const entryKeys = Object.keys(catalog.entries);

  if (catalog.count !== entryKeys.length) {
    issues.push({
      path: "count",
      message: `count (${catalog.count}) does not match entries (${entryKeys.length})`,
      severity: "warn",
    });
  }

  for (const [id, entry] of Object.entries(catalog.entries)) {
    const prefix = `entries.${id}`;
    issues.push(...validateEntry(entry, prefix));

    const profileMeta = profileLandmarks.get(id);
    if (!profileMeta) {
      issues.push({
        path: prefix,
        message: `landmark id "${id}" not found in country-profiles.json`,
        severity: "warn",
      });
      continue;
    }

    if (
      entry.countryName.trim().toLowerCase() !==
      profileMeta.countryName.trim().toLowerCase()
    ) {
      issues.push({
        path: `${prefix}.countryName`,
        message: `countryName mismatch (catalog: ${entry.countryName}, profile: ${profileMeta.countryName})`,
        severity: "warn",
      });
    }
  }

  let missingDetails = 0;
  for (const id of profileLandmarks.keys()) {
    if (!catalog.entries[id]?.ai?.fact?.trim()) {
      missingDetails += 1;
    }
  }

  const totalLandmarks = profileLandmarks.size;
  if (totalLandmarks > 0) {
    const coverage = (totalLandmarks - missingDetails) / totalLandmarks;
    if (coverage < MIN_LANDMARK_DETAIL_ENRICHED_RATIO) {
      issues.push({
        path: "entries",
        message: `coverage ${(coverage * 100).toFixed(1)}% below minimum ${(MIN_LANDMARK_DETAIL_ENRICHED_RATIO * 100).toFixed(0)}% (${missingDetails} landmarks missing AI)`,
        severity: "warn",
      });
    }
  }

  return issues;
}

export function assertValidStaticLandmarkDetailsCatalog(
  catalog: StaticLandmarkDetailsCatalog,
  profiles: StaticCountryProfileCatalog,
): void {
  const errors = validateStaticLandmarkDetailsCatalog(catalog, profiles).filter(
    (issue) => issue.severity === "error",
  );

  if (errors.length > 0) {
    const summary = errors
      .slice(0, 5)
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Invalid landmark details catalog (${errors.length} errors): ${summary}`,
    );
  }
}

export function isLandmarkDetailEntryEnriched(
  entry: LandmarkDetailEntry | undefined,
): boolean {
  return Boolean(entry?.ai?.fact?.trim());
}
