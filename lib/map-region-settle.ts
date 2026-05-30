import { resolveFlatZoomTier } from "@/lib/map-camera-zoom";
import { resolveGlobeZoomTier } from "@/lib/map-region-markers";

export const REGION_SWITCH_HYSTERESIS_MS = 200;
export const EXPLICIT_REGION_RELEASE_DISTANCE_DEGREES = 22;

export type ExplicitRegionLock = {
  region: string;
  anchor: [number, number];
};

export type RegionSettleDecision =
  | { kind: "skip"; reason: "disabled" | "animating" }
  | {
      kind: "world_tier";
      clearPending: true;
      resetWorld: boolean;
      clearSuppressWorldReset: boolean;
    }
  | {
      kind: "explore_tier";
      clearSuppressWorldReset: true;
      setExploreMode: true;
      nearestRegion: string;
      releaseExplicitLock: boolean;
      holdExplicitLock: boolean;
      clearPending: boolean;
      scheduleRegionSwitch: string | null;
      keepPendingCandidate: boolean;
    }
  | {
      kind: "explore_tier";
      clearSuppressWorldReset: true;
      setExploreMode: true;
      nearestRegion: null;
      releaseExplicitLock: false;
      holdExplicitLock: false;
      clearPending: true;
      scheduleRegionSwitch: null;
      keepPendingCandidate: false;
    };

/** Pure decision for map region settle after the camera stops moving. */
export function resolveRegionSettleDecision(input: {
  latitudeDelta: number;
  globeDistance?: number;
  /** When true, tier comes from globe distance instead of flat latitudeDelta. */
  useGlobeDistance?: boolean;
  mapCenter: { latitude: number; longitude: number };
  /** False when this viewport is not driving region settle (e.g. flat map under 3D). */
  settleEnabled?: boolean;
  isMapAnimating: boolean;
  suppressWorldReset: boolean;
  explicitLock: ExplicitRegionLock | null;
  currentFocusedRegion: string | null;
  nearestRegion: string | null;
  pendingCandidate: string | null;
}): RegionSettleDecision {
  if (input.settleEnabled === false) {
    return { kind: "skip", reason: "disabled" };
  }
  if (input.isMapAnimating) {
    return { kind: "skip", reason: "animating" };
  }

  const nextTier = input.useGlobeDistance
    ? resolveGlobeZoomTier(input.globeDistance ?? Number.POSITIVE_INFINITY)
    : resolveFlatZoomTier(input.latitudeDelta);
  let suppressWorldReset = input.suppressWorldReset;

  if (suppressWorldReset && nextTier !== "world") {
    suppressWorldReset = false;
  }

  if (nextTier === "world") {
    return {
      kind: "world_tier",
      clearPending: true,
      resetWorld: !suppressWorldReset,
      clearSuppressWorldReset: suppressWorldReset !== input.suppressWorldReset,
    };
  }

  const nearestRegion = input.nearestRegion;
  if (!nearestRegion) {
    return {
      kind: "explore_tier",
      clearSuppressWorldReset: true,
      setExploreMode: true,
      nearestRegion: null,
      releaseExplicitLock: false,
      holdExplicitLock: false,
      clearPending: true,
      scheduleRegionSwitch: null,
      keepPendingCandidate: false,
    };
  }

  const explicitLock = input.explicitLock;
  if (explicitLock && nearestRegion !== explicitLock.region) {
    const dLat = input.mapCenter.latitude - explicitLock.anchor[0];
    const dLng = input.mapCenter.longitude - explicitLock.anchor[1];
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    if (distance < EXPLICIT_REGION_RELEASE_DISTANCE_DEGREES) {
      return {
        kind: "explore_tier",
        clearSuppressWorldReset: true,
        setExploreMode: true,
        nearestRegion,
        releaseExplicitLock: false,
        holdExplicitLock: true,
        clearPending: true,
        scheduleRegionSwitch: null,
        keepPendingCandidate: false,
      };
    }
  }

  const releaseExplicitLock =
    !!explicitLock && nearestRegion !== explicitLock.region;

  if (nearestRegion === input.currentFocusedRegion) {
    return {
      kind: "explore_tier",
      clearSuppressWorldReset: true,
      setExploreMode: true,
      nearestRegion,
      releaseExplicitLock,
      holdExplicitLock: false,
      clearPending: true,
      scheduleRegionSwitch: null,
      keepPendingCandidate: false,
    };
  }

  if (input.pendingCandidate === nearestRegion) {
    return {
      kind: "explore_tier",
      clearSuppressWorldReset: true,
      setExploreMode: true,
      nearestRegion,
      releaseExplicitLock,
      holdExplicitLock: false,
      clearPending: false,
      scheduleRegionSwitch: null,
      keepPendingCandidate: true,
    };
  }

  return {
    kind: "explore_tier",
    clearSuppressWorldReset: true,
    setExploreMode: true,
    nearestRegion,
    releaseExplicitLock,
    holdExplicitLock: false,
    clearPending: true,
    scheduleRegionSwitch: nearestRegion,
    keepPendingCandidate: false,
  };
}

/** Whether a hysteresis timer should commit the pending region switch. */
export function shouldCommitScheduledRegionSwitch(input: {
  latitudeDelta?: number;
  globeDistance?: number;
  useGlobeDistance?: boolean;
  pendingCandidate: string | null;
  expectedRegion: string;
}): boolean {
  const tier = input.useGlobeDistance
    ? resolveGlobeZoomTier(input.globeDistance ?? Number.POSITIVE_INFINITY)
    : resolveFlatZoomTier(input.latitudeDelta ?? Number.POSITIVE_INFINITY);
  if (tier === "world") {
    return false;
  }
  return input.pendingCandidate === input.expectedRegion;
}
