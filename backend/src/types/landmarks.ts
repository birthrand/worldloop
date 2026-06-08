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
};
