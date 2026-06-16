import { CONTINENTS } from "../../constants/regions.js";
import {
  MAX_CATALOG_IMAGES,
  MIN_CATALOG_COUNTRIES,
  MIN_CATALOG_IMAGES,
  type CountryCatalogEntry,
  type StaticCountryCatalog,
} from "../../types/country-catalog.js";
import type { CountryVideo } from "../../types/country.js";

const VALID_REGIONS = new Set<string>(CONTINENTS);

export type CatalogValidationIssue = {
  path: string;
  message: string;
};

export type CatalogValidationWarning = {
  message: string;
};

const VALID_VIDEO_PROVIDERS = new Set(["pexels", "pixabay"]);
const DIRECT_MP4_HOST_SUFFIXES = ["pexels.com", "pixabay.com"] as const;
const PEXELS_PAGE_HOSTS = new Set(["www.pexels.com", "pexels.com"]);

function isDirectCultureVideoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    if (PEXELS_PAGE_HOSTS.has(host) && !host.startsWith("videos.")) {
      return false;
    }

    const isKnownCdn = DIRECT_MP4_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
    if (!isKnownCdn) return false;

    return url.pathname.endsWith(".mp4") || host.startsWith("videos.");
  } catch {
    return false;
  }
}

function validateVideos(
  videos: CountryVideo[] | undefined,
  prefix: string,
): CatalogValidationIssue[] {
  if (videos === undefined) return [];

  const issues: CatalogValidationIssue[] = [];

  if (!Array.isArray(videos)) {
    issues.push({ path: prefix, message: "videos must be an array" });
    return issues;
  }

  if (videos.length > 1) {
    issues.push({
      path: prefix,
      message: `videos.length must be 0-1, got ${videos.length}`,
    });
  }

  if (videos.length === 0) return issues;

  const video = videos[0]!;

  if (!video.url?.trim() || !isHttpsUrl(video.url)) {
    issues.push({
      path: `${prefix}.videos[0].url`,
      message: "video URL must be valid https",
    });
  } else if (!isDirectCultureVideoUrl(video.url)) {
    issues.push({
      path: `${prefix}.videos[0].url`,
      message: "video URL must be a direct MP4 CDN link, not a watch page",
    });
  }

  if (video.poster !== undefined && video.poster !== "") {
    if (!isHttpsUrl(video.poster)) {
      issues.push({
        path: `${prefix}.videos[0].poster`,
        message: "poster must be https when present",
      });
    }
  }

  if (video.provider !== undefined && video.provider !== "") {
    if (!VALID_VIDEO_PROVIDERS.has(video.provider)) {
      issues.push({
        path: `${prefix}.videos[0].provider`,
        message: `provider must be pexels or pixabay, got "${video.provider}"`,
      });
    }
  }

  if (video.duration !== undefined) {
    if (!Number.isInteger(video.duration) || video.duration <= 0) {
      issues.push({
        path: `${prefix}.videos[0].duration`,
        message: "duration must be a positive integer when present",
      });
    }
  }

  return issues;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateEntry(
  country: CountryCatalogEntry,
  index: number,
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const prefix = `countries[${index}] (${country.name || "unknown"})`;

  if (!country.name?.trim()) {
    issues.push({ path: prefix, message: "missing name" });
  }
  if (!country.capital?.trim()) {
    issues.push({ path: prefix, message: "missing capital" });
  }
  if (!country.region?.trim() || !VALID_REGIONS.has(country.region)) {
    issues.push({
      path: prefix,
      message: `invalid region "${country.region}"`,
    });
  }
  if (!Number.isFinite(country.population) || country.population < 0) {
    issues.push({ path: prefix, message: "invalid population" });
  }
  if (!country.cca2?.trim() || country.cca2.trim().length !== 2) {
    issues.push({ path: prefix, message: "invalid cca2" });
  }
  if (!country.flag?.trim() || !isHttpsUrl(country.flag)) {
    issues.push({ path: prefix, message: "invalid flag URL" });
  }
  if (
    !Array.isArray(country.latlng) ||
    country.latlng.length !== 2 ||
    !Number.isFinite(country.latlng[0]) ||
    !Number.isFinite(country.latlng[1]) ||
    country.latlng[0] < -90 ||
    country.latlng[0] > 90 ||
    country.latlng[1] < -180 ||
    country.latlng[1] > 180
  ) {
    issues.push({ path: prefix, message: "invalid latlng" });
  }

  const imageCount = country.images?.length ?? 0;
  if (imageCount < MIN_CATALOG_IMAGES || imageCount > MAX_CATALOG_IMAGES) {
    issues.push({
      path: prefix,
      message: `images.length must be ${MIN_CATALOG_IMAGES}-${MAX_CATALOG_IMAGES}, got ${imageCount}`,
    });
  }

  for (const [imageIndex, imageUrl] of (country.images ?? []).entries()) {
    if (!isHttpsUrl(imageUrl)) {
      issues.push({
        path: `${prefix}.images[${imageIndex}]`,
        message: "image URL must be https",
      });
    }
  }

  const uniqueImages = new Set(country.images ?? []);
  if (uniqueImages.size !== (country.images?.length ?? 0)) {
    issues.push({ path: prefix, message: "duplicate image URLs" });
  }

  if (!country.ai?.fact?.trim()) {
    issues.push({ path: prefix, message: "missing ai.fact" });
  }
  if (!country.ai?.caption?.trim()) {
    issues.push({ path: prefix, message: "missing ai.caption" });
  }
  if (!country.ai?.narration?.trim()) {
    issues.push({ path: prefix, message: "missing ai.narration" });
  }

  const factCount = country.ai?.facts?.length ?? 0;
  if (factCount !== imageCount) {
    issues.push({
      path: prefix,
      message: `ai.facts.length (${factCount}) must match images.length (${imageCount})`,
    });
  }

  if (country.ai?.fact !== country.ai?.facts?.[0]) {
    issues.push({
      path: prefix,
      message: "ai.fact must equal ai.facts[0]",
    });
  }

  issues.push(...validateVideos(country.videos, prefix));

  return issues;
}

export function collectCatalogWarnings(
  catalog: StaticCountryCatalog,
): CatalogValidationWarning[] {
  const warnings: CatalogValidationWarning[] = [];
  const total = catalog.countries.length;

  if (total === 0) return warnings;

  const withVideo = catalog.countries.filter(
    (country) => (country.videos?.length ?? 0) >= 1,
  ).length;
  const coveragePct = (withVideo / total) * 100;

  if (coveragePct < 90) {
    warnings.push({
      message: `only ${withVideo}/${total} countries (${coveragePct.toFixed(1)}%) have videos — target ≥ 90%`,
    });
  }

  const urlToCountries = new Map<string, string[]>();
  for (const country of catalog.countries) {
    const url = country.videos?.[0]?.url?.trim();
    if (!url) continue;
    const existing = urlToCountries.get(url) ?? [];
    existing.push(country.name);
    urlToCountries.set(url, existing);
  }

  for (const [url, countries] of urlToCountries) {
    if (countries.length > 1) {
      warnings.push({
        message: `duplicate video URL shared by ${countries.join(", ")}: ${url}`,
      });
    }
  }

  return warnings;
}

export function validateStaticCountryCatalog(
  catalog: StaticCountryCatalog,
  options?: { minCountries?: number },
): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const minCountries = options?.minCountries ?? MIN_CATALOG_COUNTRIES;

  if (catalog.version !== 1) {
    issues.push({
      path: "version",
      message: `expected version 1, got ${catalog.version}`,
    });
  }

  if (!Array.isArray(catalog.countries)) {
    issues.push({ path: "countries", message: "must be an array" });
    return issues;
  }

  if (catalog.countries.length < minCountries) {
    issues.push({
      path: "countries",
      message: `expected at least ${minCountries} countries, got ${catalog.countries.length}`,
    });
  }

  if (catalog.count !== catalog.countries.length) {
    issues.push({
      path: "count",
      message: `count (${catalog.count}) must match countries.length (${catalog.countries.length})`,
    });
  }

  const names = new Set<string>();
  const codes = new Set<string>();

  catalog.countries.forEach((country, index) => {
    issues.push(...validateEntry(country, index));

    const nameKey = country.name.trim().toLowerCase();
    if (names.has(nameKey)) {
      issues.push({
        path: `countries[${index}]`,
        message: `duplicate name "${country.name}"`,
      });
    }
    names.add(nameKey);

    const codeKey = country.cca2.trim().toLowerCase();
    if (codes.has(codeKey)) {
      issues.push({
        path: `countries[${index}]`,
        message: `duplicate cca2 "${country.cca2}"`,
      });
    }
    codes.add(codeKey);
  });

  return issues;
}

export function assertValidStaticCountryCatalog(
  catalog: StaticCountryCatalog,
  options?: { minCountries?: number },
): void {
  const issues = validateStaticCountryCatalog(catalog, options);
  if (issues.length === 0) return;

  const summary = issues
    .slice(0, 20)
    .map((issue) => `  - ${issue.path}: ${issue.message}`)
    .join("\n");

  const extra =
    issues.length > 20 ? `\n  ... and ${issues.length - 20} more` : "";

  throw new Error(
    `Catalog validation failed (${issues.length} issues):\n${summary}${extra}`,
  );
}
