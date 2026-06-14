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

export type DiscoveryScopeMode =
  | "forYou"
  | "here"
  | "region"
  | "saved"
  | "places";

export type DiscoveryScope = {
  mode: DiscoveryScopeMode;
  tier: ZoomTier;
  bbox: BBox | null;
  focusedRegion: string | null;
  activeCountryName: string | null;
  /** Monotonic commit token — increments on each map scope settle. */
  settledAt: number;
};
