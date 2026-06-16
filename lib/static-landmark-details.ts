import { STATIC_LANDMARK_DETAILS_CATALOG_ENABLED } from "@/constants/static-catalog";
import detailsJson from "@/data/landmark-details.json";
import type { LandmarkAiContent } from "@/lib/api";
import type {
  LandmarkDetailEntry,
  StaticLandmarkDetailsCatalog,
} from "@/types/landmark-details-catalog";

const catalog = detailsJson as StaticLandmarkDetailsCatalog;

let detailsById: Map<string, LandmarkDetailEntry> | null = null;

function ensureDetailsLoaded(): void {
  if (detailsById) return;

  detailsById = new Map(Object.entries(catalog.entries ?? {}));
}

export function isStaticLandmarkDetailsCatalogEnabled(): boolean {
  return (
    STATIC_LANDMARK_DETAILS_CATALOG_ENABLED &&
    Object.keys(catalog.entries ?? {}).length > 0
  );
}

export function getStaticLandmarkDetailsCatalogCount(): number {
  return catalog.count;
}

export function getStaticLandmarkDetailById(
  landmarkId: string,
): LandmarkDetailEntry | null {
  if (!landmarkId.trim()) return null;

  ensureDetailsLoaded();
  return detailsById?.get(landmarkId.trim()) ?? null;
}

export function getStaticLandmarkAiById(
  landmarkId: string,
): LandmarkAiContent | null {
  const detail = getStaticLandmarkDetailById(landmarkId);
  if (!detail?.ai?.fact?.trim()) return null;
  return {
    fact: detail.ai.fact.trim(),
    city: detail.ai.city?.trim() || null,
  };
}

export function isStaticLandmarkDetailEnriched(landmarkId: string): boolean {
  return Boolean(getStaticLandmarkAiById(landmarkId)?.fact?.trim());
}
