import { createVideoPlayer, type VideoPlayer } from "expo-video";

import { captureFirstFrameFromPlayer } from "@/lib/video-first-frame-registry";

/** Max pooled players — top + next stack + rolling prefetch window. */
const MAX_POOL_SIZE = 6;

type PoolEntry = {
  player: VideoPlayer;
  lastUsed: number;
  retainCount: number;
};

const pool = new Map<string, PoolEntry>();
/** Maps each acquire call to its pool key — release is idempotent per owner token. */
const activeOwners = new Map<symbol, string>();
let useCounter = 0;

export type PooledCultureVideoPlayerHandle = {
  player: VideoPlayer;
  owner: symbol;
  sourceKey: string;
};

export function cultureVideoSourceKey(source: string | number): string {
  return typeof source === "number" ? `asset:${source}` : source;
}

function getOrCreatePooledCultureVideoPlayer(
  source: string | number,
): VideoPlayer {
  const key = cultureVideoSourceKey(source);
  const existing = pool.get(key);
  if (existing) {
    existing.lastUsed = ++useCounter;
    return existing.player;
  }

  while (pool.size >= MAX_POOL_SIZE) {
    if (!evictOldestPoolEntry()) break;
  }

  const player = createVideoPlayer(source);
  player.muted = true;
  player.loop = true;
  pool.set(key, { player, lastUsed: ++useCounter, retainCount: 0 });
  return player;
}

function evictOldestPoolEntry(): boolean {
  let oldestKey: string | null = null;
  let oldestUse = Infinity;

  for (const [key, entry] of pool) {
    if (entry.retainCount > 0) continue;

    if (entry.lastUsed < oldestUse) {
      oldestUse = entry.lastUsed;
      oldestKey = key;
    }
  }

  if (!oldestKey) return false;

  pool.get(oldestKey)?.player.release();
  pool.delete(oldestKey);
  return true;
}

function shrinkPoolToMaxSize(): void {
  while (pool.size > MAX_POOL_SIZE) {
    if (!evictOldestPoolEntry()) break;
  }
}

function attachOneShotFirstFrameCapture(
  player: VideoPlayer,
  sourceKey: string,
): void {
  if (captureFirstFrameFromPlayer(player, sourceKey)) return;

  const statusSubscription = player.addListener(
    "statusChange",
    ({ status }) => {
      if (status !== "readyToPlay") return;

      captureFirstFrameFromPlayer(player, sourceKey);
      try {
        statusSubscription.remove();
      } catch {
        // Player released before warm listener teardown.
      }
    },
  );

  const timeSubscription = player.addListener(
    "timeUpdate",
    ({ currentTime }) => {
      if (currentTime <= 0) return;

      captureFirstFrameFromPlayer(player, sourceKey);
      try {
        timeSubscription.remove();
      } catch {
        // Player released before warm listener teardown.
      }
    },
  );
}

function safePrimePlayer(player: VideoPlayer, sourceKey: string): void {
  try {
    // Some platforms defer download until play() — prime then leave paused.
    player.play();
    player.pause();
    captureFirstFrameFromPlayer(player, sourceKey);
    queueMicrotask(() => captureFirstFrameFromPlayer(player, sourceKey));
    attachOneShotFirstFrameCapture(player, sourceKey);
  } catch {
    // Native player was released before prime completed.
  }
}

/** Mount-scoped retain — get or create, then mark as in-use by a slide. */
export function acquirePooledCultureVideoPlayer(
  source: string | number,
): PooledCultureVideoPlayerHandle {
  const key = cultureVideoSourceKey(source);
  const player = getOrCreatePooledCultureVideoPlayer(source);
  const entry = pool.get(key);
  if (entry) entry.retainCount += 1;

  const owner = Symbol("pooled-culture-video");
  activeOwners.set(owner, key);

  return { player, owner, sourceKey: key };
}

/** End mount-scoped retain; stale owner tokens are ignored. */
export function releasePooledCultureVideoPlayer(owner: symbol): void {
  const key = activeOwners.get(owner);
  if (!key) return;

  activeOwners.delete(owner);

  const entry = pool.get(key);
  if (!entry) return;

  entry.retainCount = Math.max(0, entry.retainCount - 1);

  queueMicrotask(() => {
    shrinkPoolToMaxSize();
  });
}

/** Headless byte warm — no retain; one-shot decode capture only. */
export function primePooledCultureVideoPlayer(source: string | number): void {
  const key = cultureVideoSourceKey(source);
  const player = getOrCreatePooledCultureVideoPlayer(source);
  safePrimePlayer(player, key);
}

export function getPooledCultureVideoPlayer(
  source: string | number,
): VideoPlayer | undefined {
  return pool.get(cultureVideoSourceKey(source))?.player;
}
