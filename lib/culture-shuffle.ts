const DEFAULT_SEED = "default";
const MAX_SEED_LENGTH = 64;

/** Mirrors backend `parseCultureFeedSeed` for consistent shuffle order. */
export function parseCultureFeedSeed(raw?: string): string {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_SEED;
  }

  const seed = raw.trim();
  if (seed.length > MAX_SEED_LENGTH) {
    return seed.slice(0, MAX_SEED_LENGTH);
  }

  return seed;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle — same algorithm as backend culture feed. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const list = [...items];
  const random = createSeededRng(seed);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
