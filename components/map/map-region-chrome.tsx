import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { continentDisplayLabel } from "@/constants/regions";

type MapRegionChromeProps = {
  focusedRegion: string;
  bottom: number;
  onContinentPress: () => void;
  onWorldPress: () => void;
};

export function MapRegionChrome({
  focusedRegion,
  bottom,
  onContinentPress,
  onWorldPress,
}: MapRegionChromeProps) {
  const label = continentDisplayLabel(focusedRegion);

  const handleContinentPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinentPress();
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
          accessibilityLabel="Back to world map"
          onPress={handleWorldPress}
          style={({ pressed }) => [
            styles.segment,
            styles.worldSegment,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-undo" size={18} color="#ffffff" />
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
    minWidth: 168,
    minHeight: 44,
    borderRadius: 32,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  segment: {
    minHeight: 44,
    justifyContent: "center",
  },
  regionSegment: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  worldSegment: {
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
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
