import type { DiscoveryScopeMode } from "@/types/geo";

/** Swipe deck shows landmark cards instead of country cards. */
export function usesLandmarkQueue(mode: DiscoveryScopeMode): boolean {
  return mode === "places" || mode === "savedLandmarks";
}

export function isSavedCountriesFeed(mode: DiscoveryScopeMode): boolean {
  return mode === "saved";
}

export function isSavedLandmarksFeed(mode: DiscoveryScopeMode): boolean {
  return mode === "savedLandmarks";
}
