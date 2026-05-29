import { useEffect, useMemo, useRef, useState } from "react";

import { logMapDebug } from "@/lib/map-debug";
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
const REGION_SWAP_CLEAR_DELAY_MS = 90;

export function useMapMarkerReveal({
  candidateCountries,
  viewportCenter,
  focusedRegion,
  focalCountryName = null,
  isDetailZoom,
  enabled,
  paused = false,
}: UseMapMarkerRevealParams): UseMapMarkerRevealResult {
  /**
   * The single source of truth for which markers are mounted. Kept in state (not
   * derived during render) so a flight settling never swaps the whole set in the
   * same commit — transitions only happen via the effect/timers below.
   */
  const [renderedCountries, setRenderedCountries] = useState<MapCountry[]>([]);
  const [revealGeneration, setRevealGeneration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Region the current reveal belongs to — reset only when this changes. */
  const revealRegionRef = useRef<string | null>(null);
  /** How many candidates are currently revealed (synchronous reads in timers). */
  const revealedCountRef = useRef(0);

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

  useEffect(() => {
    clearRevealInterval();
    clearSwapTimer();

    // While a flight animates, stop mounting/unmounting marker batches — the
    // rendered snapshot keeps the current pins on screen until the camera settles.
    if (paused) {
      logMapDebug("reveal", "paused — holding markers", {
        focusedRegion,
        candidateCount: sortedCandidates.length,
        revealed: revealedCountRef.current,
      });
      return;
    }

    if (!enabled || sortedCandidates.length === 0) {
      revealRegionRef.current = null;
      revealedCountRef.current = 0;
      setRenderedCountries([]);
      return;
    }

    const total = sortedCandidates.length;
    const priorityCount = Math.min(MARKER_REVEAL_PRIORITY_BATCH, total);

    // Grows the revealed window one batch at a time (addition-only commits).
    const startBatchInterval = () => {
      intervalRef.current = setInterval(() => {
        const next = Math.min(
          revealedCountRef.current + MARKER_REVEAL_BATCH_SIZE,
          total,
        );
        revealedCountRef.current = next;
        setRenderedCountries(sortedCandidates.slice(0, next));
        logMapDebug("reveal", "batch mounted", {
          focusedRegion,
          to: next,
          total,
        });
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
      revealedCountRef.current = 0;
      setRenderedCountries([]);
      setRevealGeneration((g) => g + 1);
      logMapDebug("reveal", "start batched reveal (new region)", {
        focusedRegion,
        priorityCount,
        total,
        batchSize: MARKER_REVEAL_BATCH_SIZE,
        intervalMs: MARKER_REVEAL_BATCH_INTERVAL_MS,
        clearDelayMs: REGION_SWAP_CLEAR_DELAY_MS,
      });

      swapTimerRef.current = setTimeout(() => {
        swapTimerRef.current = null;
        if (isDetailZoom) {
          revealedCountRef.current = total;
          setRenderedCountries(sortedCandidates);
          return;
        }
        revealedCountRef.current = priorityCount;
        setRenderedCountries(sortedCandidates.slice(0, priorityCount));
        if (priorityCount < total) {
          startBatchInterval();
        }
      }, REGION_SWAP_CLEAR_DELAY_MS);
      return;
    }

    // Same region — never tear down; only ever grow the revealed window.
    if (isDetailZoom) {
      revealedCountRef.current = total;
      setRenderedCountries(sortedCandidates);
      return;
    }

    const startCount = Math.min(
      Math.max(revealedCountRef.current, priorityCount),
      total,
    );
    if (startCount !== revealedCountRef.current) {
      logMapDebug("reveal", "resume reveal (same region)", {
        focusedRegion,
        from: revealedCountRef.current,
        startCount,
        total,
      });
    }
    revealedCountRef.current = startCount;
    setRenderedCountries(sortedCandidates.slice(0, startCount));
    if (startCount < total) {
      startBatchInterval();
    }
  }, [
    enabled,
    focusedRegion,
    isDetailZoom,
    candidateSetKey,
    sortedCandidates.length,
    paused,
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
