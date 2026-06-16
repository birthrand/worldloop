/**
 * @deprecated Import from `@/lib/map-transition-engine` instead.
 * Thin re-export layer preserved for backward compatibility.
 */

export {
  createInitialTransitionMemory as createInitialCameraTransitionMemory,
  getTransitionMemory as getCameraTransitionMemory,
  recordTransitionResolved as recordCameraTransitionResolved,
  recordTransitionResolved as recordCountryDetailCameraResolved,
  resetTransitionMemoryForTests as resetCameraTransitionMemoryForTests,
} from "@/lib/map-transition-engine";
export type { MapTransitionMemory as MapCameraTransitionMemory } from "@/lib/map-transition-engine";

import type { MapTransitionMemory } from "@/lib/map-transition-engine";
import { getTransitionMemory } from "@/lib/map-transition-engine";

/** @deprecated Use resolveMapTransition from map-transition-engine */
export function resolveCountryDetailCameraTransition(input: {
  countryName: string;
  memory?: MapTransitionMemory;
}): { shouldAnimate: boolean } {
  const memory = input.memory ?? getTransitionMemory();

  if (!memory.countryDetailInitialized) {
    return { shouldAnimate: true };
  }

  if (memory.lastCountryDetailResolvedName !== input.countryName) {
    return { shouldAnimate: true };
  }

  return { shouldAnimate: false };
}

/** @deprecated Use resolveMapTransition */
export function resolveCameraTransitionDecision(input: {
  countryName: string;
  memory: MapTransitionMemory;
}): { shouldAnimate: boolean } {
  return resolveCountryDetailCameraTransition(input);
}
