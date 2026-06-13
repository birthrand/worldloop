import { nextMapNavigationIntentId } from "@/lib/map-navigation-intent";

/**
 * Layer 2 — Execution (camera)
 *
 * Latest intent wins: cancel in-flight work and never stack camera flights.
 * Execution ids are monotonic and local to the map screen — separate from
 * store intent ids (intent layer truth).
 */

export function isSupersededCameraExecution(
  capturedIntentId: number,
  currentIntentId: number,
): boolean {
  return capturedIntentId !== currentIntentId;
}

/** Allocate the next camera execution generation (always moves forward). */
export function nextCameraExecutionIntentId(currentIntentId: number): number {
  const allocated = nextMapNavigationIntentId();
  return Math.max(currentIntentId + 1, allocated);
}
