import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { continentDisplayLabel } from "@/constants/regions";

type MapRegionChromeProps = {
  focusedRegion: string;
  bottom: number;
  onContinentPress: () => void;
  onPreviousContinent: () => void;
  onNextContinent: () => void;
  onWorldPress: () => void;
};

export function MapRegionChrome({
  focusedRegion,
  bottom,
  onContinentPress,
  onPreviousContinent,
  onNextContinent,
  onWorldPress,
}: MapRegionChromeProps) {
  const label = continentDisplayLabel(focusedRegion);

  const handlePrevious = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPreviousContinent();
  };

  const handleNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNextContinent();
  };

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.stack}>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous continent"
            onPress={handlePrevious}
            style={({ pressed }) => [
              styles.navButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.navChevron}>&lt;</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Back to ${label} view`}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onContinentPress();
            }}
            style={({ pressed }) => [
              styles.centerButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="globe-outline" size={18} color="#fbbf24" />
            <Text style={styles.regionLabel} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next continent"
            onPress={handleNext}
            style={({ pressed }) => [
              styles.navButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.navChevron}>&gt;</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to world map"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onWorldPress();
          }}
          style={({ pressed }) => [styles.worldRow, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-undo-outline" size={18} color="#ffffff" />
          <Text style={styles.worldLabel}>Back to World</Text>
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
    minWidth: 200,
    borderRadius: 20,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  navChevron: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#94a3b8",
    lineHeight: 22,
  },
  centerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  worldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
  },
  regionLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#fbbf24",
  },
  worldLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    textAlign: "center",
  },
  pressed: {
    backgroundColor: "#29303C",
  },
});
