import { StyleSheet, Text, View } from "react-native";

import {
  travelMapCountryPinColor,
  travelMapLandmarkPinColor,
} from "@/components/travel-map/travel-map-legend";
import {
  TRAVEL_MAP_COUNTRY_CATEGORY_LABELS,
  TRAVEL_MAP_COUNTRY_CATEGORY_PRIORITY,
  TRAVEL_MAP_LANDMARK_CATEGORY_LABELS,
  type TravelMapCountryPinCategory,
  type TravelMapLandmarkPinCategory,
} from "@/constants/travel-map-legend";

type TravelMapLegendBadgesProps = {
  countryCategories?: TravelMapCountryPinCategory[];
  landmarkCategory?: TravelMapLandmarkPinCategory;
};

function sortCountryCategories(
  categories: TravelMapCountryPinCategory[],
): TravelMapCountryPinCategory[] {
  return TRAVEL_MAP_COUNTRY_CATEGORY_PRIORITY.filter((category) =>
    categories.includes(category),
  );
}

export function TravelMapLegendBadges({
  countryCategories = [],
  landmarkCategory,
}: TravelMapLegendBadgesProps) {
  const sortedCountryCategories = sortCountryCategories(countryCategories);

  if (sortedCountryCategories.length === 0 && !landmarkCategory) {
    return null;
  }

  return (
    <View style={styles.root}>
      {sortedCountryCategories.map((category) => (
        <View
          key={category}
          style={[
            styles.badge,
            {
              borderColor: `${travelMapCountryPinColor(category)}55`,
              backgroundColor: `${travelMapCountryPinColor(category)}18`,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: travelMapCountryPinColor(category) },
            ]}
          />
          <Text className="text-[12px] leading-4 text-white/85">
            {TRAVEL_MAP_COUNTRY_CATEGORY_LABELS[category]}
          </Text>
        </View>
      ))}
      {landmarkCategory ? (
        <View
          style={[
            styles.badge,
            {
              borderColor: `${travelMapLandmarkPinColor(landmarkCategory)}55`,
              backgroundColor: `${travelMapLandmarkPinColor(landmarkCategory)}18`,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: travelMapLandmarkPinColor(landmarkCategory) },
            ]}
          />
          <Text className="text-[12px] leading-4 text-white/85">
            {TRAVEL_MAP_LANDMARK_CATEGORY_LABELS[landmarkCategory]}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
