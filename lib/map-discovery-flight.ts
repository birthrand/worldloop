import type { Region } from "react-native-maps";

import { LANDMARK_FOCUS_LATITUDE_DELTA } from "@/constants/map-focus-tiers";
import { WORLD_INITIAL_REGION } from "@/constants/map-regions";
import type { FlightPhase } from "@/hooks/use-map-flight";
import type { MapCluster } from "@/lib/map-clusters";
import { resolveCountryFocusLatitudeDelta } from "@/lib/map-country-focus-zoom";
import {
  flightRegionForContinentContextCountry,
  flightRegionForCountry,
  flightRegionForWorldViewCountry,
} from "@/lib/map-signal-sources";
import type { SelectionSource } from "@/store/use-identity-store";
import type { MapCountry } from "@/types/country";

const WORLD_PHASE_MS = 700;
const CONTINENT_PHASE_MS = 600;
const COUNTRY_PHASE_MS = 750;
/** Random FAB — one pan at world zoom to the country. */
const WORLD_VIEW_PAN_MS = 900;
/** Explore → Map (2D) — one flight to the country-centered continent frame. */
export const EXPLORE_MAP_FLIGHT_MS = 750;
/** Direct map taps are already near the target — snap in faster. */
const COUNTRY_TAP_MS = 520;
/** Preview shuffle — one continuous retarget from the current camera. */
export const COUNTRY_RETARGET_MS = 680;
/** In-session Explore map country switch — pan from current viewport. */
export const EXPLORE_MAP_RETARGET_MS = COUNTRY_RETARGET_MS;

/** One continuous camera move — avoids stacked animateToRegion crashes on iOS. */
const COUNTRY_RETARGET_SOURCES = new Set<Exclude<SelectionSource, null>>([
  "mapTap",
  "shuffle",
]);

export type DiscoveryFlightParams = {
  pick: MapCountry;
  /** Continent cluster the country belongs to (frames the middle phase). */
  cluster: MapCluster | null;
  source: Exclude<SelectionSource, null>;
  /** Opening world pan — included for cinematic programmatic discovery only. */
  includeWorld: boolean;
  /** Focus keeps continent framing; preview zooms to country detail. */
  mode?: "focus" | "preview";
  /** Explore map session — pan from current viewport (not the entry fly-in). */
  exploreInSession?: boolean;
};

const WORLD_VIEW_PAN_SOURCES = new Set<Exclude<SelectionSource, null>>(["fab"]);

export const COUNTRY_DETAIL_FLIGHT_MS = 900;

const COUNTRY_DETAIL_SOURCES = new Set<Exclude<SelectionSource, null>>([
  "countryDetail",
]);

export function regionForLandmarkFocus(
  latitude: number,
  longitude: number,
  latitudeDelta = LANDMARK_FOCUS_LATITUDE_DELTA,
): Region {
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta: latitudeDelta,
  };
}

export function buildLandmarkDetailPhases(
  latitude: number,
  longitude: number,
): FlightPhase[] {
  return [
    {
      region: regionForLandmarkFocus(latitude, longitude),
      duration: COUNTRY_DETAIL_FLIGHT_MS,
    },
  ];
}

/**
 * Builds camera phases for country navigation.
 * Marker density/UI derive separately from live zoom — phases only move the camera.
 *
 * Two zoom intents:
 * - **Explore → Map (2D)**: one flight to the selected country center (continent frame)
 * - **FAB**: world-view pan — "where is this country?"
 * - **Country focus** (detail / search / tap): Tier 1 framing — "show me THIS country"
 *
 * Map tap and preview shuffle retarget in one continuous flight from the current viewport.
 */
export function buildDiscoveryPhases({
  pick,
  cluster,
  source,
  includeWorld,
  mode = "focus",
  exploreInSession = false,
}: DiscoveryFlightParams): FlightPhase[] {
  const countryFocusDelta = resolveCountryFocusLatitudeDelta(pick);
  const countryRegion = flightRegionForCountry(pick);
  const countryFocusRegion = flightRegionForCountry(pick, countryFocusDelta);

  if (COUNTRY_DETAIL_SOURCES.has(source)) {
    return [
      {
        region: countryFocusRegion,
        duration: COUNTRY_DETAIL_FLIGHT_MS,
      },
    ];
  }

  if (WORLD_VIEW_PAN_SOURCES.has(source)) {
    return [
      {
        region: flightRegionForWorldViewCountry(pick),
        duration: WORLD_VIEW_PAN_MS,
      },
    ];
  }

  if (source === "explore") {
    if (exploreInSession) {
      return [
        {
          region: flightRegionForContinentContextCountry(pick),
          duration: EXPLORE_MAP_RETARGET_MS,
        },
      ];
    }
    return [
      {
        region: flightRegionForContinentContextCountry(pick),
        duration: EXPLORE_MAP_FLIGHT_MS,
      },
    ];
  }

  if (COUNTRY_RETARGET_SOURCES.has(source)) {
    const duration = source === "mapTap" ? COUNTRY_TAP_MS : COUNTRY_RETARGET_MS;
    const region = mode === "preview" ? countryRegion : countryFocusRegion;
    return [{ region, duration }];
  }

  const continentRegion: Region = flightRegionForContinentContextCountry(pick);

  const phases: FlightPhase[] = [];
  if (includeWorld) {
    phases.push({ region: WORLD_INITIAL_REGION, duration: WORLD_PHASE_MS });
  }
  phases.push({ region: continentRegion, duration: CONTINENT_PHASE_MS });
  if (mode === "preview") {
    phases.push({ region: countryRegion, duration: COUNTRY_PHASE_MS });
  }
  return phases;
}
