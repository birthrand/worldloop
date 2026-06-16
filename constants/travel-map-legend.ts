/** Legend swatch colors — keep in sync with `TravelMapLegend`. */
export const TRAVEL_MAP_LEGEND_COLORS = {
  visited: "#14b8a6",
  savedPlace: "#3b82f6",
  savedLandmark: "#a78bfa",
  recentlyViewed: "#f472b6",
} as const;

export type TravelMapCountryPinCategory =
  | "visited"
  | "savedPlace"
  | "recentlyViewed";

export type TravelMapLandmarkPinCategory = "savedLandmark" | "recentlyViewed";

export type TravelMapLegendFilterId =
  | TravelMapCountryPinCategory
  | "savedLandmark";

export type TravelMapLegendVisibility = Record<
  TravelMapLegendFilterId,
  boolean
>;

export const TRAVEL_MAP_LEGEND_DEFAULT_VISIBILITY: TravelMapLegendVisibility = {
  visited: true,
  savedPlace: true,
  savedLandmark: true,
  recentlyViewed: true,
};

export const TRAVEL_MAP_LEGEND_ITEMS: ReadonlyArray<{
  id: TravelMapLegendFilterId;
  color: string;
  label: string;
}> = [
  {
    id: "visited",
    color: TRAVEL_MAP_LEGEND_COLORS.visited,
    label: "Visited countries",
  },
  {
    id: "savedPlace",
    color: TRAVEL_MAP_LEGEND_COLORS.savedPlace,
    label: "Saved places",
  },
  {
    id: "savedLandmark",
    color: TRAVEL_MAP_LEGEND_COLORS.savedLandmark,
    label: "Saved landmarks",
  },
  {
    id: "recentlyViewed",
    color: TRAVEL_MAP_LEGEND_COLORS.recentlyViewed,
    label: "Recently viewed places",
  },
];

/** Pin color when a country belongs to multiple travel-map categories. */
export const TRAVEL_MAP_COUNTRY_CATEGORY_PRIORITY: TravelMapCountryPinCategory[] =
  ["savedPlace", "visited", "recentlyViewed"];

export const TRAVEL_MAP_COUNTRY_CATEGORY_LABELS: Record<
  TravelMapCountryPinCategory,
  string
> = {
  savedPlace: "Saved place",
  visited: "Visited",
  recentlyViewed: "Recently viewed",
};

export const TRAVEL_MAP_LANDMARK_CATEGORY_LABELS: Record<
  TravelMapLandmarkPinCategory,
  string
> = {
  savedLandmark: "Saved landmark",
  recentlyViewed: "Recently viewed",
};

export function resolveTravelMapCountryDisplayCategory(
  categories: TravelMapCountryPinCategory[],
  visibility?: TravelMapLegendVisibility,
): TravelMapCountryPinCategory | null {
  for (const category of TRAVEL_MAP_COUNTRY_CATEGORY_PRIORITY) {
    if (!categories.includes(category)) {
      continue;
    }
    if (visibility && !visibility[category]) {
      continue;
    }
    return category;
  }
  return null;
}
