import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StaticCountryProfileCatalog } from "../types/country-profile-catalog.js";
import type { StaticLandmarkDetailsCatalog } from "../types/landmark-details-catalog.js";
import {
  assertValidStaticLandmarkDetailsCatalog,
  isLandmarkDetailEntryEnriched,
  validateStaticLandmarkDetailsCatalog,
} from "./lib/landmark-details-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROFILES_PATH = path.join(ROOT, "data", "country-profiles.json");
const DETAILS_PATH = path.join(ROOT, "data", "landmark-details.json");

async function main(): Promise<void> {
  const [profilesRaw, detailsRaw] = await Promise.all([
    readFile(PROFILES_PATH, "utf8"),
    readFile(DETAILS_PATH, "utf8"),
  ]);

  const profiles = JSON.parse(profilesRaw) as StaticCountryProfileCatalog;
  const catalog = JSON.parse(detailsRaw) as StaticLandmarkDetailsCatalog;
  const issues = validateStaticLandmarkDetailsCatalog(catalog, profiles);

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warn");

  if (errors.length > 0) {
    console.error(
      `Landmark details validation failed (${errors.length} errors):\n`,
    );
    for (const issue of errors.slice(0, 30)) {
      console.error(`  - ${issue.path}: ${issue.message}`);
    }
    if (errors.length > 30) {
      console.error(`  ... and ${errors.length - 30} more`);
    }
    process.exit(1);
  }

  assertValidStaticLandmarkDetailsCatalog(catalog, profiles);

  const profileLandmarkCount = profiles.profiles.reduce(
    (total, profile) => total + (profile.landmarks?.length ?? 0),
    0,
  );
  const enriched = Object.values(catalog.entries).filter(
    isLandmarkDetailEntryEnriched,
  ).length;
  const sizeKb = (Buffer.byteLength(detailsRaw) / 1024).toFixed(1);

  console.log("Landmark details validation passed.");
  console.log(`  entries:     ${catalog.count}`);
  console.log(`  enriched:    ${enriched}`);
  console.log(
    `  coverage:    ${profileLandmarkCount > 0 ? ((enriched / profileLandmarkCount) * 100).toFixed(1) : "0.0"}% of profile landmarks`,
  );
  console.log(`  warnings:    ${warnings.length}`);
  console.log(`  path:        ${DETAILS_PATH}`);
  console.log(`  size:        ~${sizeKb} KB`);

  if (warnings.length > 0) {
    console.log("");
    console.log("Warnings (non-fatal):");
    for (const issue of warnings.slice(0, 10)) {
      console.log(`  - ${issue.path}: ${issue.message}`);
    }
    if (warnings.length > 10) {
      console.log(`  ... and ${warnings.length - 10} more`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
