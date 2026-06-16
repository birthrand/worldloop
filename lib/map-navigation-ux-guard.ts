/**
 * Layer 3 — UX guard (noise control)
 *
 * Time-based throttles and identical rapid-repeat filtering for taps.
 * Not business logic — never block cross-screen intents at this layer.
 */

export const MAP_NAVIGATION_TAP_COOLDOWN_MS = 400;

export function shouldAcceptNavigationTap(input: {
  nowMs: number;
  lastTapAtMs: number;
  cooldownMs?: number;
  isAnimating?: boolean;
}): boolean {
  if (input.isAnimating) {
    return false;
  }

  const cooldown = input.cooldownMs ?? MAP_NAVIGATION_TAP_COOLDOWN_MS;
  return input.nowMs - input.lastTapAtMs >= cooldown;
}

export function shouldIgnoreIdenticalRapidRepeat(input: {
  last: { countryName: string; source: string; atMs: number } | null;
  next: { countryName: string; source: string };
  nowMs: number;
  windowMs?: number;
}): boolean {
  if (!input.last) {
    return false;
  }

  const window = input.windowMs ?? MAP_NAVIGATION_TAP_COOLDOWN_MS;
  if (input.nowMs - input.last.atMs > window) {
    return false;
  }

  return (
    input.last.countryName === input.next.countryName &&
    input.last.source === input.next.source
  );
}

/** Ignore stale async pool resolutions when taps overlap. */
export function isAsyncPickGenerationCurrent(
  generation: number,
  currentGeneration: number,
): boolean {
  return generation === currentGeneration;
}
