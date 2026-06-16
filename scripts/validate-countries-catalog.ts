import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StaticCountryCatalog } from "../types/country-catalog.js";
import {
  assertValidStaticCountryCatalog,
  collectCatalogWarnings,
  validateStaticCountryCatalog,
} from "./lib/catalog-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, "../data/countries.json");

async function main(): Promise<void> {
  const raw = await readFile(CATALOG_PATH, "utf8");
  const catalog = JSON.parse(raw) as StaticCountryCatalog;
  const issues = validateStaticCountryCatalog(catalog);

  if (issues.length > 0) {
    console.error(`Catalog validation failed (${issues.length} issues):\n`);
    for (const issue of issues.slice(0, 30)) {
      console.error(`  - ${issue.path}: ${issue.message}`);
    }
    if (issues.length > 30) {
      console.error(`  ... and ${issues.length - 30} more`);
    }
    process.exit(1);
  }

  assertValidStaticCountryCatalog(catalog);

  const warnings = collectCatalogWarnings(catalog);
  if (warnings.length > 0) {
    console.warn(`Catalog warnings (${warnings.length}):\n`);
    for (const warning of warnings) {
      console.warn(`  - ${warning.message}`);
    }
    console.warn("");
  }

  const withVideo = catalog.countries.filter(
    (country) => (country.videos?.length ?? 0) >= 1,
  ).length;

  const sizeKb = (Buffer.byteLength(raw) / 1024).toFixed(1);
  console.log("Catalog validation passed.");
  console.log(`  with videos: ${withVideo}/${catalog.count}`);
  console.log(`  countries: ${catalog.count}`);
  console.log(`  path:      ${CATALOG_PATH}`);
  console.log(`  size:      ~${sizeKb} KB`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
