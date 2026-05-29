import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Region } from "react-native-maps";

import { logMapDebug, summarizeRegion } from "@/lib/map-debug";

export type FlightPhase = {
  region: Region;
  duration: number;
};

type UseMapFlightParams = {
  /** Issues the actual flat-map camera move. */
  animateToRegion: (region: Region, duration: number) => void;
  /** Fires true when a sequence starts and false only when it fully settles. */
  onActiveChange?: (active: boolean) => void;
};

export type FlightCancelOptions = {
  /** When true, stale timers/runId are cleared without firing active=false. */
  keepActive?: boolean;
};

export type MapFlightController = {
  /**
   * Run an ordered phase sequence (e.g. world -> continent -> country).
   * Cancels any in-flight sequence first so taps/selection can retarget the camera.
   */
  flyTo: (phases: FlightPhase[], onComplete?: () => void) => void;
  /** Cancel pending phases and mark the current flight stale. */
  cancel: (options?: FlightCancelOptions) => void;
  isActive: () => boolean;
};

/** Pause after each phase duration before the next animateToRegion (iOS needs headroom). */
const PHASE_GAP_MS = 220;
/** Extra time after the final phase before declaring the flight settled. */
const SETTLE_BUFFER_MS = 250;

/**
 * Serializes flat-map camera flights through a single in-flight slot.
 * Overlapping animateToRegion calls can crash iOS react-native-maps, so an
 * interrupting flight defers its first move by a tick to let the prior one yield.
 */
export function useMapFlight({
  animateToRegion,
  onActiveChange,
}: UseMapFlightParams): MapFlightController {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runIdRef = useRef(0);
  const activeRef = useRef(false);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const setActive = useCallback(
    (next: boolean) => {
      if (activeRef.current === next) return;
      activeRef.current = next;
      onActiveChange?.(next);
    },
    [onActiveChange],
  );

  const cancel = useCallback(
    (options?: FlightCancelOptions) => {
      const cancelledRunId = runIdRef.current;
      const wasActive = activeRef.current;
      const keepActive = options?.keepActive === true;
      clearTimers();
      runIdRef.current += 1;
      if (!keepActive) {
        setActive(false);
      }
      logMapDebug("flight", "cancel", {
        cancelledRunId,
        nextRunId: runIdRef.current,
        wasActive,
        keepActive,
      });
    },
    [clearTimers, setActive],
  );

  const flyTo = useCallback(
    (phases: FlightPhase[], onComplete?: () => void) => {
      if (phases.length === 0) {
        cancel();
        return;
      }

      const wasActive = activeRef.current;
      clearTimers();
      const runId = ++runIdRef.current;
      setActive(true);

      logMapDebug("flight", "flyTo start", {
        runId,
        wasActive,
        phaseCount: phases.length,
        phases: phases.map((p, i) => ({
          index: i,
          duration: p.duration,
          region: summarizeRegion(p.region),
        })),
      });

      let elapsed = 0;
      phases.forEach((phase, index) => {
        const issue = () => {
          if (runIdRef.current !== runId) {
            logMapDebug("flight", "phase skipped (stale run)", {
              runId,
              currentRunId: runIdRef.current,
              phaseIndex: index,
            });
            return;
          }
          logMapDebug("flight", "phase issue animateToRegion", {
            runId,
            phaseIndex: index,
            duration: phase.duration,
            region: summarizeRegion(phase.region),
          });
          animateToRegion(phase.region, phase.duration);
        };

        const deferFirstPhase = phases.length > 1;
        if (index === 0 && !wasActive && !deferFirstPhase) {
          // Single-phase flights can start immediately.
          issue();
        } else {
          // Multi-phase and interrupting flights defer every phase so
          // animateToRegion calls never overlap on react-native-maps (iOS crash).
          const delay = index === 0 && !wasActive ? 0 : elapsed;
          const id = setTimeout(issue, delay);
          timersRef.current.push(id);
        }

        elapsed += phase.duration + PHASE_GAP_MS;
      });

      const totalDuration = Math.max(
        0,
        elapsed - PHASE_GAP_MS + SETTLE_BUFFER_MS,
      );
      const completeId = setTimeout(() => {
        if (runIdRef.current !== runId) {
          logMapDebug("flight", "complete skipped (stale run)", {
            runId,
            currentRunId: runIdRef.current,
          });
          return;
        }
        logMapDebug("flight", "flyTo settled", { runId, totalDuration });
        setActive(false);
        onComplete?.();
      }, totalDuration);
      timersRef.current.push(completeId);
    },
    [animateToRegion, cancel, clearTimers, setActive],
  );

  useEffect(() => {
    return () => {
      clearTimers();
      runIdRef.current += 1;
      activeRef.current = false;
    };
  }, [clearTimers]);

  const isActive = useCallback(() => activeRef.current, []);

  // Stable identity so consumer callbacks/effects don't churn each render.
  return useMemo(
    () => ({ flyTo, cancel, isActive }),
    [flyTo, cancel, isActive],
  );
}
