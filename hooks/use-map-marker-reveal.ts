import { useEffect, useMemo, useRef, useState } from "react";

import {
  MARKER_REVEAL_BATCH_INTERVAL_MS,
  MARKER_REVEAL_BATCH_SIZE,
  MARKER_REVEAL_PRIORITY_BATCH,
  type MapMarkerPresentation,
  sortCountriesByViewportPriority,
} from "@/lib/map-region-markers";
import type { MapCountry } from "@/types/country";

type ViewportCenter = {
  latitude: number;
  longitude: number;
};

type UseMapMarkerRevealParams = {
  candidateCountries: MapCountry[];
  viewportCenter: ViewportCenter;
  focusedRegion: string | null;
  /** Selected / in-flight country — always revealed first at continent zoom. */
  focalCountryName?: string | null;
  isDetailZoom: boolean;
  enabled: boolean;
  /**
   * Holds the rendered marker set steady (no new batch mounts / region swaps).
   * Set true during a camera flight so marker churn never overlaps animateToRegion,
   * which can crash react-native-maps on iOS.
   */
  paused?: boolean;
  /**
   * Bumped by continent navigation before focusedRegion changes so marker
   * removal commits while the previous region is still active (avoids a frame
   * where stale pins overlap animateToRegion).
   */
  prepareSwapToken?: number;
  /** Override clear delay between pin removal and first batch mount (default 90ms). */
  regionClearDelayMs?: number;
};

type UseMapMarkerRevealResult = {
  countriesToRender: MapCountry[];
  presentation: MapMarkerPresentation;
  revealGeneration: number;
};

/**
 * Delay between clearing the previous region's pins and mounting the new
 * region's pins. Removing N markers and adding M markers in the SAME native
 * transaction churns react-native-maps and crashes iOS, so we split the swap
 * into a removal-only commit followed (one tick later) by addition-only commits.
 */
export const MARKER_REGION_SWAP_CLEAR_DELAY_MS = 90;
/** Extra settle time before mounting pins after a 2D cross-region flight. */
export const CROSS_REGION_REVEAL_EXTRA_DELAY_MS = 150;
/** Lag continent focus polygons after focusedRegion commits post cross-region flight. */
export const CROSS_REGION_OVERLAY_LAG_MS = 200;

const clampCount = (count: number, total: number) =>
  Math.min(Math.max(0, count), total);

export function useMapMarkerReveal({
  candidateCountries,
  viewportCenter,
  focusedRegion,
  focalCountryName = null,
  isDetailZoom,
  enabled,
  paused = false,
  prepareSwapToken = 0,
  regionClearDelayMs = MARKER_REGION_SWAP_CLEAR_DELAY_MS,
}: UseMapMarkerRevealParams): UseMapMarkerRevealResult {
  /**
   * The single source of truth for which markers are mounted. Kept in state (not
   * derived during render) so a flight settling never swaps the whole set in the
   * same commit — transitions only happen via the effect/timers below.
   */
  const [renderedCountries, setRenderedCountries] = useState<MapCountry[]>([]);
  const [revealGeneration, setRevealGeneration] = useState(0);
  /**
   * Synchronous mirror of revealGeneration. Every reset bumps this immediately
   * so batch timers scheduled under an older generation can detect they are
   * stale and bail before mounting pins for a region the reveal has left.
   */
  const generationRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Region the current reveal belongs to — reset only when this changes. */
  const revealRegionRef = useRef<string | null>(null);
  /** Pending region when focusedRegion changes during a paused flight. */
  const pendingRegionRef = useRef<string | null>(null);
  /** How many candidates are currently revealed (synchronous reads in timers). */
  const revealedCountRef = useRef(0);
  /** Detects viewport pool changes while a flight holds the rendered snapshot. */
  const prevCandidateSetKeyRef = useRef<string | null>(null);

  /** Single place to advance the generation so the ref and state never drift. */
  const bumpGeneration = () => {
    generationRef.current += 1;
    const next = generationRef.current;
    setRevealGeneration(next);
    return next;
  };

  const sortedCandidates = useMemo(() => {
    if (!enabled || candidateCountries.length === 0) return [];
    return sortCountriesByViewportPriority(
      candidateCountries,
      viewportCenter.latitude,
      viewportCenter.longitude,
      focalCountryName,
    );
  }, [
    candidateCountries,
    enabled,
    focalCountryName,
    viewportCenter.latitude,
    viewportCenter.longitude,
  ]);

  /** Stable across viewport sort order — avoids reveal restarts when the globe spins. */
  const candidateSetKey = useMemo(
    () =>
      candidateCountries
        .map((country) => country.name)
        .sort()
        .join("\0"),
    [candidateCountries],
  );

  const clearRevealInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearSwapTimer = () => {
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
  };

  const prepareSwapTokenRef = useRef(prepareSwapToken);

  useEffect(() => {
    if (prepareSwapToken === prepareSwapTokenRef.current) return;
    prepareSwapTokenRef.current = prepareSwapToken;

    clearRevealInterval();
    clearSwapTimer();
    revealedCountRef.current = 0;
    pendingRegionRef.current = null;
    setRenderedCountries([]);
    bumpGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable ref-based clears
  }, [prepareSwapToken]);

  useEffect(() => {
    clearRevealInterval();
    clearSwapTimer();

    // While a flight animates, stop mounting/unmounting marker batches — the
    // rendered snapshot keeps the current pins on screen until the camera settles.
    if (paused) {
      const regionChanged =
        focusedRegion !== null && revealRegionRef.current !== focusedRegion;

      if (regionChanged) {
        revealedCountRef.current = 0;
        pendingRegionRef.current = focusedRegion;
        // Do not clear renderedCountries here — unmounting during a camera
        // flight crashes react-native-maps. Cross-region continent navigation
        // uses prepareSwapToken to clear markers before focusedRegion updates.
      }
      return;
    }

    pendingRegionRef.current = null;

    if (!enabled || sortedCandidates.length === 0) {
      revealRegionRef.current = null;
      revealedCountRef.current = 0;
      prevCandidateSetKeyRef.current = null;
      setRenderedCountries([]);
      return;
    }

    const total = sortedCandidates.length;
    const priorityCount = Math.min(MARKER_REVEAL_PRIORITY_BATCH, total);

    // Grows the revealed window one batch at a time (addition-only commits).
    // Captures the generation it was scheduled under so a batch queued before a
    // region swap cannot mount stale pins after the reveal has moved on.
    const startBatchInterval = (generationAtStart: number) => {
      intervalRef.current = setInterval(() => {
        if (generationRef.current !== generationAtStart) {
          clearRevealInterval();
          return;
        }
        const next = clampCount(
          revealedCountRef.current + MARKER_REVEAL_BATCH_SIZE,
          total,
        );
        revealedCountRef.current = next;
        setRenderedCountries(sortedCandidates.slice(0, next));
        if (next >= total) {
          clearRevealInterval();
        }
      }, MARKER_REVEAL_BATCH_INTERVAL_MS);
    };

    // Only treat this as a fresh reveal when the region actually changed.
    // Same-region re-runs (e.g. resuming after a flight, viewport reorder) must
    // NOT drop already-mounted pins — tearing markers down + rebuilding them on
    // every FAB tap churns react-native-maps until it crashes natively.
    const isNewRegion = revealRegionRef.current !== focusedRegion;
    revealRegionRef.current = focusedRegion;

    if (isNewRegion) {
      // Phase 1 (this commit): remove the previous region's pins only. Phase 2
      // (after the clear delay): mount the new region's pins. Splitting the
      // remove/add across commits avoids the simultaneous churn that crashes iOS.
      // A region change is always a generation change — counters reset together.
      revealedCountRef.current = 0;
      prevCandidateSetKeyRef.current = null;
      setRenderedCountries([]);
      const generationAtStart = bumpGeneration();

      swapTimerRef.current = setTimeout(() => {
        swapTimerRef.current = null;
        // A swap that started before another region change must not paint pins.
        if (generationRef.current !== generationAtStart) return;
        if (isDetailZoom) {
          revealedCountRef.current = total;
          setRenderedCountries(sortedCandidates);
          return;
        }
        revealedCountRef.current = priorityCount;
        setRenderedCountries(sortedCandidates.slice(0, priorityCount));
        if (priorityCount < total) {
          startBatchInterval(generationAtStart);
        }
      }, regionClearDelayMs);
      return;
    }

    // Same region — never tear down; only ever grow the revealed window.
    if (isDetailZoom) {
      revealedCountRef.current = total;
      prevCandidateSetKeyRef.current = candidateSetKey;
      setRenderedCountries(sortedCandidates);
      return;
    }

    const candidateSetChanged =
      prevCandidateSetKeyRef.current !== null &&
      prevCandidateSetKeyRef.current !== candidateSetKey;
    const revealedExceedsPool = revealedCountRef.current > total;
    prevCandidateSetKeyRef.current = candidateSetKey;

    // After a paused flight the camera may have moved, shrinking the viewport
    // pool (e.g. 59 → 16) while revealedCount still reflects the old snapshot.
    if (revealedExceedsPool || candidateSetChanged) {
      revealedCountRef.current = clampCount(revealedCountRef.current, total);
      const startCount = clampCount(
        Math.max(revealedCountRef.current, priorityCount),
        total,
      );
      revealedCountRef.current = startCount;
      setRenderedCountries(sortedCandidates.slice(0, startCount));
      if (startCount < total) {
        startBatchInterval(generationRef.current);
      }
      return;
    }

    const startCount = clampCount(
      Math.max(revealedCountRef.current, priorityCount),
      total,
    );
    revealedCountRef.current = startCount;
    setRenderedCountries(sortedCandidates.slice(0, startCount));
    if (startCount < total) {
      startBatchInterval(generationRef.current);
    }
  }, [
    enabled,
    focusedRegion,
    isDetailZoom,
    candidateSetKey,
    sortedCandidates.length,
    paused,
    regionClearDelayMs,
  ]);

  // Unmount-only cleanup — every effect run clears timers at its top, but early
  // returns mean the last run may not register a cleanup of its own.
  useEffect(() => {
    return () => {
      clearRevealInterval();
      clearSwapTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable ref-based clears
  }, []);

  const presentation: MapMarkerPresentation = isDetailZoom
    ? "full"
    : "entering";

  return {
    countriesToRender: renderedCountries,
    presentation,
    revealGeneration,
  };
}
