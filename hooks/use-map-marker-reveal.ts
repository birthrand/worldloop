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
  isDetailZoom: boolean;
  enabled: boolean;
  /** Holds reveal state during programmatic map flights (recenter, focus). */
  suspendReveal?: boolean;
};

type UseMapMarkerRevealResult = {
  countriesToRender: MapCountry[];
  presentation: MapMarkerPresentation;
  revealGeneration: number;
};

export function useMapMarkerReveal({
  candidateCountries,
  viewportCenter,
  focusedRegion,
  isDetailZoom,
  enabled,
  suspendReveal = false,
}: UseMapMarkerRevealParams): UseMapMarkerRevealResult {
  const [revealedCount, setRevealedCount] = useState(0);
  const [revealGeneration, setRevealGeneration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortedCandidates = useMemo(() => {
    if (!enabled || candidateCountries.length === 0) return [];
    return sortCountriesByViewportPriority(
      candidateCountries,
      viewportCenter.latitude,
      viewportCenter.longitude,
    );
  }, [
    candidateCountries,
    enabled,
    viewportCenter.latitude,
    viewportCenter.longitude,
  ]);

  const sortedCandidateNamesKey = useMemo(
    () =>
      sortedCandidates
        .map((country) => country.name)
        .sort()
        .join("\0"),
    [sortedCandidates],
  );

  const clearRevealInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (suspendReveal) {
      return;
    }

    clearRevealInterval();

    if (!enabled || sortedCandidates.length === 0) {
      setRevealedCount(0);
      return;
    }

    if (isDetailZoom) {
      setRevealedCount(sortedCandidates.length);
      return;
    }

    const priorityCount = Math.min(
      MARKER_REVEAL_PRIORITY_BATCH,
      sortedCandidates.length,
    );
    setRevealedCount(priorityCount);
    setRevealGeneration((g) => g + 1);

    if (priorityCount >= sortedCandidates.length) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setRevealedCount((prev) => {
        const next = Math.min(
          prev + MARKER_REVEAL_BATCH_SIZE,
          sortedCandidates.length,
        );
        if (next >= sortedCandidates.length) {
          clearRevealInterval();
        }
        return next;
      });
    }, MARKER_REVEAL_BATCH_INTERVAL_MS);

    return clearRevealInterval;
  }, [
    enabled,
    focusedRegion,
    isDetailZoom,
    sortedCandidateNamesKey,
    sortedCandidates.length,
    suspendReveal,
  ]);

  const presentation: MapMarkerPresentation = isDetailZoom ? "full" : "entering";

  const countriesToRender = useMemo(() => {
    if (!enabled) return [];
    if (isDetailZoom) return sortedCandidates;
    return sortedCandidates.slice(0, revealedCount);
  }, [enabled, isDetailZoom, revealedCount, sortedCandidates]);

  return {
    countriesToRender,
    presentation,
    revealGeneration,
  };
}
