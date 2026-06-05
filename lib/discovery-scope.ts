import { ensureGeoIndex } from "@/lib/geo-index";
import {
  bboxFromGlobeCamera,
  bboxFromMapRegion,
  resolveZoomTier,
} from "@/lib/map-viewport-bbox";
import {
  countriesInBBox,
  rankCountriesByViewportCenter,
} from "@/lib/spatial-query";
import type { MapCountry } from "@/types/country";
import type {
  BBox,
  DiscoveryScope,
  DiscoveryScopeMode,
  GeoEntity,
  ZoomTier,
} from "@/types/geo";
import type { Region } from "react-native-maps";

export type CommitScopeInput = {
  bbox: BBox | null;
  tier: ZoomTier;
  focusedRegion: string | null;
  activeCountryName: string | null;
  viewportCenter: { lat: number; lng: number };
  mode?: DiscoveryScopeMode;
};

export type CommitScopeFromMapInput = {
  mapMode: "2d" | "3d";
  mapCountries: MapCountry[];
  focusedRegion: string | null;
  activeCountryName: string | null;
  viewportCenter: { lat: number; lng: number };
  mode?: DiscoveryScopeMode;
  /** 2D settle — when set, bbox is derived from the flat map region. */
  flatRegion?: Region;
  /** 3D settle — when set, bbox is derived from globe camera state. */
  globeCamera?: {
    targetLat: number;
    targetLng: number;
    distance: number;
  };
  latitudeDelta?: number;
  globeDistance?: number;
};

const EMPTY_SCOPE: DiscoveryScope = {
  mode: "forYou",
  tier: "world",
  bbox: null,
  focusedRegion: null,
  activeCountryName: null,
  settledAt: 0,
};

let discoverySequence = 0;

/** Monotonic per-commit token — unique across rapid map settles. */
export function nextDiscoverySequence(): number {
  discoverySequence += 1;
  return discoverySequence;
}

export function defaultDiscoveryScope(): DiscoveryScope {
  return { ...EMPTY_SCOPE };
}

export function buildDiscoveryScope(
  input: CommitScopeInput,
  previousMode: DiscoveryScopeMode = "forYou",
): DiscoveryScope {
  return {
    mode: input.mode ?? previousMode,
    tier: input.tier,
    bbox: input.bbox,
    focusedRegion: input.focusedRegion,
    activeCountryName: input.activeCountryName,
    settledAt: nextDiscoverySequence(),
  };
}

/**
 * Resolve viewport countries for a map settle event.
 * Neighbor narrowing at country tier is deferred to step 15c/15d.
 */
export function resolveViewportCountries(
  input: CommitScopeFromMapInput,
  previousMode: DiscoveryScopeMode = "forYou",
): { scope: DiscoveryScope; viewportCountries: GeoEntity[] } {
  const tier = resolveZoomTier({
    mapMode: input.mapMode,
    latitudeDelta: input.latitudeDelta,
    globeDistance: input.globeDistance,
    focusedRegion: input.focusedRegion,
    activeCountryName: input.activeCountryName,
  });

  let bbox: BBox | null = null;

  if (input.flatRegion) {
    bbox = bboxFromMapRegion(input.flatRegion);
  } else if (input.globeCamera) {
    bbox = bboxFromGlobeCamera(input.globeCamera);
  }

  const scope = buildDiscoveryScope(
    {
      bbox,
      tier,
      focusedRegion: input.focusedRegion,
      activeCountryName: input.activeCountryName,
      viewportCenter: input.viewportCenter,
      mode: input.mode,
    },
    previousMode,
  );

  if (tier === "world" || !bbox || input.mapCountries.length === 0) {
    return { scope, viewportCountries: [] };
  }

  const index = ensureGeoIndex(input.mapCountries);
  let matches = countriesInBBox(index, bbox);

  if (input.focusedRegion && tier === "continent") {
    matches = matches.filter((entity) => entity.region === input.focusedRegion);
  }

  const populationByName: Record<string, number> = {};
  for (const country of input.mapCountries) {
    populationByName[country.name] = country.population;
  }

  const viewportCountries = rankCountriesByViewportCenter(
    matches,
    input.viewportCenter,
    populationByName,
  );

  return { scope, viewportCountries };
}
