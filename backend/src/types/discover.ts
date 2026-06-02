import type { BBox } from "../lib/geo-bbox.js";
import type { MapCountry } from "./map.js";

export type DiscoverQuery = {
  west: number;
  south: number;
  east: number;
  north: number;
  centerLat: number;
  centerLng: number;
  region: string | null;
  limit: number;
  cursor: number;
};

export type DiscoverResponse = {
  data: MapCountry[];
  meta: {
    count: number;
    bbox: BBox;
    region: string | null;
    nextCursor: string | null;
  };
};
