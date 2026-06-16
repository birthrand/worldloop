import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";

import { travelMapLandmarkPinColor } from "@/components/travel-map/travel-map-legend";
import type { TravelMapLandmarkPinCategory } from "@/constants/travel-map-legend";
import type { MapLandmarkFocus } from "@/types/map-presentation";

type MapLandmarkPinProps = {
  landmark: MapLandmarkFocus;
  category?: TravelMapLandmarkPinCategory;
  selected?: boolean;
  onPress?: () => void;
};

export const MapLandmarkPin = memo(function MapLandmarkPin({
  landmark,
  category,
  selected = false,
  onPress,
}: MapLandmarkPinProps) {
  const color = category ? travelMapLandmarkPinColor(category) : "#fbbf24";

  return (
    <Marker
      coordinate={{
        latitude: landmark.latitude,
        longitude: landmark.longitude,
      }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={false}
      accessibilityLabel={`${landmark.name} location`}
      onPress={
        onPress
          ? (event) => {
              event.stopPropagation?.();
              onPress();
            }
          : undefined
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={landmark.name}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.pinWrap,
          selected && styles.pinWrapSelected,
          pressed && onPress && styles.pinWrapPressed,
        ]}
      >
        <Ionicons name="location" size={selected ? 38 : 34} color={color} />
      </Pressable>
    </Marker>
  );
});

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  pinWrapSelected: {
    transform: [{ scale: 1.08 }],
  },
  pinWrapPressed: {
    opacity: 0.85,
  },
});
