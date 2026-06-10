/** Stable-enough seed for one Culture For You session or refresh cycle. */
export function createCultureSessionSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
