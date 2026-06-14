import type { CountryLandmark } from "@/lib/api";
import type { Country } from "@/types/country";

export type PlaceFeedItem = {
  landmark: CountryLandmark;
  country: Country;
};
