import { describe, expect, it } from "vitest";

import {
  buildPlacesView,
  placesFeedCacheKey,
  type PlacesBaseFeed,
} from "@/lib/places-feed-presentation";
import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

function makeCountry(name: string): Country {
  return {
    name,
    population: 1,
    region: "Europe",
    capital: "Capital",
    flag: "🇪🇺",
    latlng: [0, 0],
    cca2: "XX",
  };
}

function makeItem(
  countryName: string,
  landmarkName: string,
  imageUrl: string | null = "https://example.com/photo.jpg",
): PlaceFeedItem {
  return {
    country: makeCountry(countryName),
    landmark: {
      id: landmarkName.toLowerCase(),
      name: landmarkName,
      type: "Landmark",
      description: "",
      latitude: 0,
      longitude: 0,
      imageUrl,
      source: "wikidata",
    },
  };
}

describe("placesFeedCacheKey", () => {
  it("keys continents by region name", () => {
    expect(placesFeedCacheKey("Europe", [])).toBe("region:Europe");
  });

  it("keys For You pool by sorted country names", () => {
    const pool = [makeCountry("Zambia"), makeCountry("Algeria")];
    expect(placesFeedCacheKey(null, pool)).toBe("pool:algeria|zambia");
  });
});

describe("buildPlacesView", () => {
  it("keeps image landmarks before landmarks without images", () => {
    const base: PlacesBaseFeed = {
      withImage: [makeItem("France", "Eiffel Tower")],
      withoutImage: [makeItem("France", "Catacombs", null)],
    };

    const view = buildPlacesView(base);
    const imageIndex = view.findIndex(
      (item) => item.landmark.name === "Eiffel Tower",
    );
    const noImageIndex = view.findIndex(
      (item) => item.landmark.name === "Catacombs",
    );

    expect(imageIndex).toBeGreaterThanOrEqual(0);
    expect(noImageIndex).toBeGreaterThan(imageIndex);
  });
});
