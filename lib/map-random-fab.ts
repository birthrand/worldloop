import {
  isAsyncPickGenerationCurrent,
  MAP_NAVIGATION_TAP_COOLDOWN_MS,
  shouldAcceptNavigationTap,
} from "@/lib/map-navigation-ux-guard";

/** @deprecated Use MAP_NAVIGATION_TAP_COOLDOWN_MS from map-navigation-ux-guard. */
export const RANDOM_FAB_TAP_COOLDOWN_MS = MAP_NAVIGATION_TAP_COOLDOWN_MS;

export function shouldAcceptRandomFabTap(input: {
  isMapAnimating: boolean;
  nowMs: number;
  lastTapAtMs: number;
  cooldownMs?: number;
}): boolean {
  return shouldAcceptNavigationTap({
    isAnimating: input.isMapAnimating,
    nowMs: input.nowMs,
    lastTapAtMs: input.lastTapAtMs,
    cooldownMs: input.cooldownMs,
  });
}

/** @deprecated Use isAsyncPickGenerationCurrent from map-navigation-ux-guard. */
export function isRandomPickGenerationCurrent(
  generation: number,
  currentGeneration: number,
): boolean {
  return isAsyncPickGenerationCurrent(generation, currentGeneration);
}
