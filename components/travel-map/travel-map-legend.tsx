import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  TRAVEL_MAP_LEGEND_COLORS,
  TRAVEL_MAP_LEGEND_ITEMS,
  type TravelMapCountryPinCategory,
  type TravelMapLandmarkPinCategory,
} from "@/constants/travel-map-legend";
import { useTravelMapLegendStore } from "@/store/use-travel-map-legend-store";

export function travelMapCountryPinColor(
  category: TravelMapCountryPinCategory,
): string {
  switch (category) {
    case "visited":
      return TRAVEL_MAP_LEGEND_COLORS.visited;
    case "savedPlace":
      return TRAVEL_MAP_LEGEND_COLORS.savedPlace;
    case "recentlyViewed":
      return TRAVEL_MAP_LEGEND_COLORS.recentlyViewed;
  }
}

export function travelMapLandmarkPinColor(
  category: TravelMapLandmarkPinCategory,
): string {
  switch (category) {
    case "savedLandmark":
      return TRAVEL_MAP_LEGEND_COLORS.savedLandmark;
    case "recentlyViewed":
      return TRAVEL_MAP_LEGEND_COLORS.recentlyViewed;
  }
}

type TravelMapLegendProps = {
  variant?: "inline" | "floating";
};

type LegendFilterRowProps = {
  color: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
};

function LegendFilterRow({
  color,
  label,
  visible,
  onToggle,
}: LegendFilterRowProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${visible ? "shown on map" : "hidden from map"}`}
      accessibilityState={{ selected: visible }}
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View
        style={[
          styles.swatchBox,
          visible ? styles.swatchBoxActive : styles.swatchBoxInactive,
          visible
            ? { borderColor: color, backgroundColor: `${color}18` }
            : null,
        ]}
      >
        {visible ? (
          <View style={[styles.swatchFilled, { backgroundColor: color }]} />
        ) : (
          <View
            style={[
              styles.swatchOutline,
              {
                borderColor: `${color}88`,
                backgroundColor: "rgba(0,0,0,0.18)",
              },
            ]}
          />
        )}
      </View>
      <Text
        style={[
          styles.label,
          {
            color: visible
              ? "rgba(255,255,255,0.88)"
              : "rgba(255,255,255,0.42)",
          },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TravelMapLegend({
  variant = "floating",
}: TravelMapLegendProps) {
  const visibility = useTravelMapLegendStore((s) => s.visibility);
  const toggleFilter = useTravelMapLegendStore((s) => s.toggleFilter);

  const content = (
    <View style={styles.root}>
      {TRAVEL_MAP_LEGEND_ITEMS.map((item) => (
        <LegendFilterRow
          key={item.id}
          color={item.color}
          label={item.label}
          visible={visibility[item.id]}
          onToggle={() => toggleFilter(item.id)}
        />
      ))}
    </View>
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <View style={styles.floatingShell}>
      {Platform.OS === "web" ? (
        <View style={styles.floatingWebFallback} />
      ) : (
        <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.floatingTint} />
      <View style={styles.floatingContent}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 32,
    alignSelf: "stretch",
  },
  rowPressed: {
    opacity: 0.88,
  },
  swatchBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchBoxActive: {
    borderStyle: "solid",
  },
  swatchBoxInactive: {
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  swatchFilled: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  swatchOutline: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 2,
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  floatingShell: {
    alignSelf: "flex-start",
    maxWidth: 240,
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingWebFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
  },
  floatingTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  floatingContent: {
    position: "relative",
  },
});
