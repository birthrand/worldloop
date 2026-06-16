/**
 * Repairs duplicate culture videos in `data/countries.json`.
 *
 * 1. Finds URLs shared by 2+ countries
 * 2. Keeps the clip on the primary country (highest population, then name A–Z)
 * 3. Refetches unique clips for the others via Pexels/Pixabay
 * 4. Writes updated rows back to the catalog
 *
 * Usage:
 *   npm run catalog:repair-video-duplicates
 *   npm run catalog:repair-video-duplicates -- --dry-run
 *   npm run catalog:repair-video-duplicates -- --delay-ms 1000
 *
 * Requires PEXELS_API_KEY and/or PIXABAY_API_KEY in backend/.env
 */
import { config as loadEnv } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CountryCatalogEntry,
  StaticCountryCatalog,
} from "../types/country-catalog.js";
import type { CountryVideo } from "../types/country.js";
import { assertValidStaticCountryCatalog } from "./lib/catalog-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data", "countries.json");
const CACHE_DIR = path.join(__dirname, ".cache");
const REPORT_PATH = path.join(CACHE_DIR, "video-dedup-repair.json");

const DEFAULT_DELAY_MS = 800;

loadEnv({ path: path.join(ROOT, ".env") });
loadEnv({ path: path.join(ROOT, "backend", ".env") });

type VideoRepairServices = {
  extractVideoAssetId: (url: string) => string;
  fetchUniqueVideoForCountry: (
    context: {
      name: string;
      capital?: string;
      subregion?: string;
      images?: string[];
    },
    usedAssetIds: Set<string>,
  ) => Promise<CountryVideo | null>;
};

async function loadVideoServices(): Promise<VideoRepairServices> {
  const module = await import("../backend/src/services/video.service.js");
  return {
    extractVideoAssetId: module.extractVideoAssetId,
    fetchUniqueVideoForCountry: module.fetchUniqueVideoForCountry,
  };
}

type CliOptions = {
  dryRun: boolean;
  delayMs: number;
  limit: number | null;
};

type DuplicateGroup = {
  url: string;
  assetId: string;
  countries: CountryCatalogEntry[];
  primary: CountryCatalogEntry;
  losers: CountryCatalogEntry[];
};

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let delayMs = DEFAULT_DELAY_MS;
  let limit: number | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--limit") {
      const raw = argv[index + 1];
      const parsed = raw ? Number.parseInt(raw, 10) : NaN;
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error("--limit requires a positive integer");
      }
      limit = parsed;
      index += 1;
      continue;
    }
    if (arg === "--delay-ms") {
      const raw = argv[index + 1];
      const parsed = raw ? Number.parseInt(raw, 10) : NaN;
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("--delay-ms requires a non-negative integer");
      }
      delayMs = parsed;
      index += 1;
    }
  }

  return { dryRun, delayMs, limit };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickPrimaryCountry(
  countries: CountryCatalogEntry[],
): CountryCatalogEntry {
  return [...countries].sort((a, b) => {
    if (b.population !== a.population) {
      return b.population - a.population;
    }
    return a.name.localeCompare(b.name);
  })[0]!;
}

function collectDuplicateGroups(
  countries: CountryCatalogEntry[],
  getAssetId: (url: string) => string,
): DuplicateGroup[] {
  const byUrl = new Map<string, CountryCatalogEntry[]>();

  for (const country of countries) {
    const url = country.videos?.[0]?.url?.trim();
    if (!url) continue;

    const list = byUrl.get(url) ?? [];
    list.push(country);
    byUrl.set(url, list);
  }

  const groups: DuplicateGroup[] = [];

  for (const [url, members] of byUrl) {
    if (members.length < 2) continue;

    const primary = pickPrimaryCountry(members);
    const losers = members.filter((country) => country.name !== primary.name);

    groups.push({
      url,
      assetId: getAssetId(url),
      countries: members,
      primary,
      losers,
    });
  }

  return groups.sort((a, b) => b.losers.length - a.losers.length);
}

function buildUsedAssetIds(
  countries: CountryCatalogEntry[],
  duplicateGroups: DuplicateGroup[],
  getAssetId: (url: string) => string,
): Set<string> {
  const loserNames = new Set(
    duplicateGroups.flatMap((group) =>
      group.losers.map((country) => country.name),
    ),
  );
  const usedAssetIds = new Set<string>();

  for (const country of countries) {
    if (loserNames.has(country.name)) continue;

    const url = country.videos?.[0]?.url?.trim();
    if (!url) continue;

    usedAssetIds.add(getAssetId(url));
  }

  return usedAssetIds;
}

async function writeCatalog(catalog: StaticCountryCatalog): Promise<void> {
  assertValidStaticCountryCatalog(catalog);
  await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.PEXELS_API_KEY && !process.env.PIXABAY_API_KEY) {
    throw new Error(
      "PEXELS_API_KEY or PIXABAY_API_KEY required in backend/.env",
    );
  }

  const services = await loadVideoServices();
  const { extractVideoAssetId: getAssetId, fetchUniqueVideoForCountry } =
    services;

  const raw = await readFile(OUTPUT_PATH, "utf8");
  const catalog = JSON.parse(raw) as StaticCountryCatalog;
  const duplicateGroups = collectDuplicateGroups(catalog.countries, getAssetId);

  if (duplicateGroups.length === 0) {
    console.log("No duplicate culture video URLs found.");
    return;
  }

  const losersAll = duplicateGroups
    .flatMap((group) => group.losers)
    .sort((a, b) => {
      if (b.population !== a.population) {
        return b.population - a.population;
      }
      return a.name.localeCompare(b.name);
    });

  const losers =
    options.limit !== null ? losersAll.slice(0, options.limit) : losersAll;

  const usedAssetIds = buildUsedAssetIds(
    catalog.countries,
    duplicateGroups,
    getAssetId,
  );

  console.log(`Duplicate URL groups: ${duplicateGroups.length}`);
  console.log(`Countries to refetch:   ${losers.length}`);
  console.log(`Reserved asset IDs:     ${usedAssetIds.size}`);
  console.log("");

  for (const group of duplicateGroups) {
    console.log(
      `[keep] ${group.primary.name} (${group.primary.population.toLocaleString()}) ← shared by ${group.countries.map((country) => country.name).join(", ")}`,
    );
  }

  console.log("");

  const refetched: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  for (const country of losers) {
    const previousUrl = country.videos?.[0]?.url ?? "";

    if (options.dryRun) {
      skipped.push(country.name);
      console.log(`[dry-run] would refetch ${country.name}`);
      continue;
    }

    console.log(`[refetch] ${country.name} …`);

    const video = await fetchUniqueVideoForCountry(
      {
        name: country.name,
        capital: country.capital,
        subregion: country.subregion,
        images: country.images,
      },
      usedAssetIds,
    );

    if (!video) {
      failed.push(country.name);
      console.log(`  ✗ no unique clip found (kept previous URL)`);
      await sleep(options.delayMs);
      continue;
    }

    const assetId = getAssetId(video.url);
    if (usedAssetIds.has(assetId)) {
      failed.push(country.name);
      console.log(`  ✗ resolved duplicate again (${assetId})`);
      await sleep(options.delayMs);
      continue;
    }

    country.videos = [video];
    usedAssetIds.add(assetId);
    refetched.push(country.name);
    console.log(`  ✓ ${video.provider ?? "unknown"} ${assetId}`);
    console.log(`    was: ${previousUrl.slice(0, 72)}…`);

    await sleep(options.delayMs);
  }

  if (!options.dryRun && refetched.length > 0) {
    catalog.generatedAt = new Date().toISOString();
    await writeCatalog(catalog);
    console.log("");
    console.log(`Updated ${OUTPUT_PATH}`);
  }

  const remainingGroups = collectDuplicateGroups(catalog.countries, getAssetId);

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(
    REPORT_PATH,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        dryRun: options.dryRun,
        duplicateGroupsBefore: duplicateGroups.length,
        duplicateGroupsAfter: remainingGroups.length,
        refetched,
        failed,
        skipped,
        remainingDuplicates: remainingGroups.map((group) => ({
          url: group.url,
          countries: group.countries.map((country) => country.name),
          primary: group.primary.name,
        })),
      },
      null,
      2,
    )}\n`,
  );

  console.log("");
  console.log(`Refetched:             ${refetched.length}`);
  console.log(`Failed:                ${failed.length}`);
  if (options.dryRun) {
    console.log(`Dry-run skips:         ${skipped.length}`);
  }
  console.log(`Duplicate groups left: ${remainingGroups.length}`);
  console.log(`Report:                ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
