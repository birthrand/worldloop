import type { LandmarkAiContent } from "@/lib/api";

/** AI enrichment for one landmark detail modal. */
export type LandmarkDetailAiContent = LandmarkAiContent;

/** One row in `data/landmark-details.json`, keyed by landmark id. */
export type LandmarkDetailEntry = {
  countryName: string;
  cca2: string;
  landmarkName: string;
  ai: LandmarkDetailAiContent;
};

/** Top-level shape written to `data/landmark-details.json`. */
export type StaticLandmarkDetailsCatalog = {
  version: number;
  generatedAt: string;
  count: number;
  entries: Record<string, LandmarkDetailEntry>;
};

export const LANDMARK_DETAILS_CATALOG_VERSION = 1;

export const MIN_LANDMARK_DETAIL_ENRICHED_RATIO = 0.9;
