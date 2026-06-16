import type { FlightPhase } from "@/hooks/use-map-flight";
import type { MapCluster } from "@/lib/map-clusters";
import {
  buildDiscoveryPhases,
  buildLandmarkDetailPhases,
  COUNTRY_DETAIL_FLIGHT_MS,
  EXPLORE_MAP_FLIGHT_MS,
  EXPLORE_MAP_RETARGET_MS,
  regionForLandmarkFocus,
} from "@/lib/map-discovery-flight";
import type { SelectionSource } from "@/store/use-identity-store";
import type { MapCountry } from "@/types/country";
import type { MapLandmarkFocus } from "@/types/map-presentation";
import type { Region } from "react-native-maps";

/**
 * Transition Decision Engine — single source of truth for map camera transitions.
 *
 * Owns animation policy, session memory, flight duration, and phase planning.
 * The map screen executor only runs the returned plan.
 */

export type MapTransitionMemory = {
  /** True after a countryDetail handoff resolved the camera at least once. */
  countryDetailInitialized: boolean;
  /** Last country resolved from country detail "View on map". */
  lastCountryDetailResolvedName: string | null;
  /** True after the first Explore → Map handoff resolved the camera. */
  exploreHandoffInitialized: boolean;
};

export type MapTransitionIntent = {
  country: MapCountry;
  mode: "focus" | "preview";
  source: Exclude<SelectionSource, null>;
  landmarkFocus?: MapLandmarkFocus;
};

export type MapTransitionContext = {
  cluster: MapCluster | null;
  useGlobeCamera: boolean;
};

export type MapTransitionMemoryRecord = "onComplete" | "immediate" | "none";

export type MapTransitionPlan = {
  shouldAnimate: boolean;
  flightDuration: number;
  flightPhases: FlightPhase[];
  targetRegion: Region | null;
  /** When the executor should persist countryDetail session memory. */
  memoryRecord: MapTransitionMemoryRecord;
  metadata: {
    source: Exclude<SelectionSource, null>;
    isRepeatVisit: boolean;
    reason: string;
    /** First Explore → Map entry — world reset + fly-in (not in-session pan). */
    exploreFlyIn: boolean;
  };
};

export function createInitialTransitionMemory(): MapTransitionMemory {
  return {
    countryDetailInitialized: false,
    lastCountryDetailResolvedName: null,
    exploreHandoffInitialized: false,
  };
}

let transitionMemory: MapTransitionMemory = createInitialTransitionMemory();

/** Read current session transition memory (map screen lifetime). */
export function getTransitionMemory(): MapTransitionMemory {
  return transitionMemory;
}

/** Record that a countryDetail handoff resolved the camera (animated or instant). */
export function recordTransitionResolved(countryName: string): void {
  transitionMemory = {
    ...transitionMemory,
    countryDetailInitialized: true,
    lastCountryDetailResolvedName: countryName,
  };
}

/** Record that the first Explore → Map handoff resolved the camera. */
export function recordExploreHandoffInitialized(): void {
  transitionMemory = {
    ...transitionMemory,
    exploreHandoffInitialized: true,
  };
}

/** Reset explore handoff memory when leaving the Explore → Map session. */
export function resetExploreHandoffTransitionMemory(): void {
  transitionMemory = {
    ...transitionMemory,
    exploreHandoffInitialized: false,
  };
}

/** Test helper — reset session memory between cases. */
export function resetTransitionMemoryForTests(): void {
  transitionMemory = createInitialTransitionMemory();
}

function decideAnimation(
  source: Exclude<SelectionSource, null>,
  countryName: string,
): boolean {
  if (source === "explore") {
    return true;
  }

  if (source !== "countryDetail") {
    return true;
  }

  const memory = getTransitionMemory();

  if (!memory.countryDetailInitialized) {
    return true;
  }

  if (memory.lastCountryDetailResolvedName !== countryName) {
    return true;
  }

  return false;
}

function resolveExploreHandoffReason(): string {
  if (getTransitionMemory().exploreHandoffInitialized) {
    return "in-session explore map country switch";
  }

  return "first Explore → Map entry";
}

function resolveCountryDetailReason(countryName: string): string {
  const memory = getTransitionMemory();

  if (!memory.countryDetailInitialized) {
    return "first countryDetail entry";
  }

  if (memory.lastCountryDetailResolvedName !== countryName) {
    return "country changed from last countryDetail visit";
  }

  return "repeat visit to same country from detail";
}

function computeFlightDuration(
  source: Exclude<SelectionSource, null>,
  useGlobeCamera: boolean,
  shouldAnimate: boolean,
  exploreInSession: boolean,
): number {
  if (!shouldAnimate) {
    return 0;
  }
  if (source === "explore" || source === "fab") {
    if (source === "explore") {
      if (exploreInSession) {
        return useGlobeCamera ? 1100 : EXPLORE_MAP_RETARGET_MS;
      }
      if (!useGlobeCamera) {
        return EXPLORE_MAP_FLIGHT_MS;
      }
    }
    return useGlobeCamera ? 1400 : 900;
  }
  if (source === "countryDetail") {
    return useGlobeCamera ? 1100 : COUNTRY_DETAIL_FLIGHT_MS;
  }
  const baseDuration = source === "mapTap" ? (useGlobeCamera ? 450 : 500) : 650;
  return useGlobeCamera ? Math.max(baseDuration, 1100) : baseDuration;
}

/**
 * Resolves a fully specified camera transition plan from intent + runtime context.
 */
export function resolveMapTransition(
  intent: MapTransitionIntent,
  context: MapTransitionContext,
): MapTransitionPlan {
  const { country, mode, source, landmarkFocus } = intent;
  const { cluster, useGlobeCamera } = context;

  const exploreInSession =
    source === "explore" && getTransitionMemory().exploreHandoffInitialized;
  const exploreFlyIn = source === "explore" && !exploreInSession;

  const shouldAnimate = landmarkFocus
    ? true
    : decideAnimation(source, country.name);
  const isRepeatVisit = source === "countryDetail" && !shouldAnimate;
  const flightDuration = computeFlightDuration(
    source,
    useGlobeCamera,
    shouldAnimate,
    exploreInSession,
  );

  const flightPhases = landmarkFocus
    ? buildLandmarkDetailPhases(
        landmarkFocus.latitude,
        landmarkFocus.longitude,
      )
    : buildDiscoveryPhases({
        pick: country,
        cluster,
        source,
        includeWorld: source === "search",
        mode,
        exploreInSession,
      });
  const targetRegion: Region | null = landmarkFocus
    ? regionForLandmarkFocus(
        landmarkFocus.latitude,
        landmarkFocus.longitude,
      )
    : (flightPhases[flightPhases.length - 1]?.region ?? null);

  let memoryRecord: MapTransitionMemoryRecord = "none";
  if (source === "countryDetail") {
    memoryRecord = shouldAnimate ? "onComplete" : "immediate";
  }

  const reason = landmarkFocus
    ? "landmark detail map entry"
    : source === "countryDetail"
      ? resolveCountryDetailReason(country.name)
      : source === "explore"
        ? resolveExploreHandoffReason()
        : `${source} navigation`;

  return {
    shouldAnimate,
    flightDuration,
    flightPhases,
    targetRegion,
    memoryRecord,
    metadata: {
      source,
      isRepeatVisit,
      reason,
      exploreFlyIn,
    },
  };
}
