import type { VideoPlayer } from "expo-video";

/** Permanent decode memory — never cleared on unmount, pool eviction, or player release. */
const firstFrameReadyMap = new Map<string, boolean>();

type Listener = (sourceKey: string) => void;
const listeners = new Set<Listener>();

export function markFirstFrameReady(sourceKey: string): void {
  if (firstFrameReadyMap.get(sourceKey)) return;

  firstFrameReadyMap.set(sourceKey, true);

  for (const listener of listeners) {
    queueMicrotask(() => listener(sourceKey));
  }
}

export function isFirstFrameReady(sourceKey: string): boolean {
  return firstFrameReadyMap.get(sourceKey) ?? false;
}

/** Snapshot decode state from a pooled player without relying on future events. */
export function captureFirstFrameFromPlayer(
  player: VideoPlayer,
  sourceKey: string,
): boolean {
  if (isFirstFrameReady(sourceKey)) return true;

  try {
    if (player.currentTime > 0) {
      markFirstFrameReady(sourceKey);
      return true;
    }

    if (player.status === "readyToPlay") {
      markFirstFrameReady(sourceKey);
      return true;
    }
  } catch {
    // Native shared object was released before capture completed.
  }

  return false;
}

export function subscribeFirstFrame(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
