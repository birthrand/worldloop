/** Minimum gap between accepted random-FAB taps (see map screen FAB handler). */
export const RANDOM_FAB_TAP_COOLDOWN_MS = 650;

export function shouldAcceptRandomFabTap(input: {
  isMapAnimating: boolean;
  nowMs: number;
  lastTapAtMs: number;
  cooldownMs?: number;
}): boolean {
  if (input.isMapAnimating) {
    return false;
  }

  const cooldown = input.cooldownMs ?? RANDOM_FAB_TAP_COOLDOWN_MS;
  return input.nowMs - input.lastTapAtMs >= cooldown;
}

/** Ignore stale async pool resolutions when taps overlap. */
export function isRandomPickGenerationCurrent(
  generation: number,
  currentGeneration: number,
): boolean {
  return generation === currentGeneration;
}
