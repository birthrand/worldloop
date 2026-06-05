export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type ZoomTier = "world" | "continent" | "country" | "local";

export type GeoEntityKind = "country";

export type GeoEntity = {
  kind: GeoEntityKind;
  /** Stable id: ISO alpha-2 when available, otherwise a name slug. */
  id: string;
  name: string;
  cca2: string;
  region: string;
  /** [latitude, longitude] */
  centroid: [number, number];
  bbox: BBox;
};

export type DiscoveryScopeMode = "forYou" | "here" | "region";

export type DiscoveryScope = {
  mode: DiscoveryScopeMode;
  tier: ZoomTier;
  bbox: BBox | null;
  focusedRegion: string | null;
  activeCountryName: string | null;
  /** ISO timestamp when scope last committed (after settle). */
  settledAt: number;
};
