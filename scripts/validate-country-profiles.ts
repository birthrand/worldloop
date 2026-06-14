import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StaticCountryCatalog } from "../types/country-catalog.js";
import type { StaticCountryProfileCatalog } from "../types/country-profile-catalog.js";
import {
  assertValidStaticCountryProfileCatalog,
  isProfileEntryEnriched,
  validateStaticCountryProfileCatalog,
} from "./lib/profile-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const COUNTRIES_PATH = path.join(ROOT, "data", "countries.json");
const PROFILES_PATH = path.join(ROOT, "data", "country-profiles.json");

async function main(): Promise<void> {
  const [countriesRaw, profilesRaw] = await Promise.all([
    readFile(COUNTRIES_PATH, "utf8"),
    readFile(PROFILES_PATH, "utf8"),
  ]);

  const countriesCatalog = JSON.parse(countriesRaw) as StaticCountryCatalog;
  const catalog = JSON.parse(profilesRaw) as StaticCountryProfileCatalog;
  const issues = validateStaticCountryProfileCatalog(catalog, countriesCatalog);

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warn");

  if (errors.length > 0) {
    console.error(`Profile validation failed (${errors.length} errors):\n`);
    for (const issue of errors.slice(0, 30)) {
      console.error(`  - ${issue.path}: ${issue.message}`);
    }
    if (errors.length > 30) {
      console.error(`  ... and ${errors.length - 30} more`);
    }
    process.exit(1);
  }

  assertValidStaticCountryProfileCatalog(catalog, countriesCatalog);

  const enriched = catalog.profiles.filter(isProfileEntryEnriched).length;
  const withWikipedia = catalog.profiles.filter((entry) =>
    entry.wikipedia?.extract?.trim(),
  ).length;
  const withLandmarks = catalog.profiles.filter(
    (entry) => (entry.landmarks?.length ?? 0) > 0,
  ).length;
  const sizeKb = (Buffer.byteLength(profilesRaw) / 1024).toFixed(1);

  console.log("Profile validation passed.");
  console.log(`  profiles:    ${catalog.count}`);
  console.log(
    `  enriched:    ${enriched} (${((enriched / catalog.count) * 100).toFixed(1)}%)`,
  );
  console.log(`  wikipedia:   ${withWikipedia}`);
  console.log(`  landmarks:   ${withLandmarks}`);
  console.log(`  warnings:    ${warnings.length}`);
  console.log(`  path:        ${PROFILES_PATH}`);
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
