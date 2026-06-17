export type LandmarkSource = "wikidata" | "osm" | "wikipedia";

export type CountryLandmark = {
  id: string;
  name: string;
  type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  source: LandmarkSource;
  yearBuilt?: number | null;
  city?: string | null;
  /** Wikidata P1435 — separate from physical landmark type. */
  isUnescoWorldHeritage?: boolean;
};

/** AI-generated landmark enrichment — fun fact + inferred city. */
export type LandmarkAiContent = {
  fact: string;
  city: string | null;
};
