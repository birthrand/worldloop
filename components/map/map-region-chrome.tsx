import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { continentDisplayLabel } from "@/constants/regions";

type MapRegionChromeProps = {
  focusedRegion: string;
  bottom: number;
  onContinentPress: () => void;
  onShowDiscovery: () => void;
  discoveryChromeVisible?: boolean;
  onWorldPress: () => void;
};

const CHROME_HEIGHT = 44;

export function MapRegionChrome({
  focusedRegion,
  bottom,
  onContinentPress,
  onShowDiscovery,
  discoveryChromeVisible = false,
  onWorldPress,
}: MapRegionChromeProps) {
  const label = continentDisplayLabel(focusedRegion);

  const handleContinentPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinentPress();
  };

  const handleShowDiscovery = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShowDiscovery();
  };

  const handleWorldPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onWorldPress();
  };

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View
        style={styles.stack}
        accessibilityRole="toolbar"
        accessibilityLabel="Region navigation"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Recenter on ${label}`}
          onPress={handleContinentPress}
          style={({ pressed }) => [
            styles.segment,
            styles.regionSegment,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.regionLabel} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            discoveryChromeVisible
              ? "Hide explore this area"
              : "Show explore this area"
          }
          onPress={handleShowDiscovery}
          hitSlop={6}
          style={({ pressed }) => [
            styles.segment,
            styles.iconSegment,
            discoveryChromeVisible && styles.iconSegmentActive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={discoveryChromeVisible ? "#fbbf24" : "#94a3b8"}
          />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to world map"
          onPress={handleWorldPress}
          style={({ pressed }) => [
            styles.segment,
            styles.worldSegment,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#ffffff" />
          <Text style={styles.worldLabel}>World</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 7,
  },
  stack: {
    flexDirection: "row",
    alignItems: "stretch",
    minWidth: 220,
    height: CHROME_HEIGHT,
    borderRadius: 32,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  segment: {
    height: CHROME_HEIGHT,
    justifyContent: "center",
  },
  regionSegment: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  iconSegment: {
    width: CHROME_HEIGHT,
    flexShrink: 0,
    alignItems: "center",
  },
  iconSegmentActive: {
    backgroundColor: "rgba(251, 191, 36, 0.1)",
  },
  worldSegment: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: 14,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  regionLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    //accent color
    color: "#fbbf24",
  },
  worldLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.95,
    backgroundColor: "#29303C",
  },
});
