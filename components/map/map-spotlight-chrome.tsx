import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { continentDisplayLabel } from "@/constants/regions";

type MapSpotlightChromeProps = {
  countryName: string;
  /** When set, show a row to return to continent exploration (clears country spotlight). */
  focusedRegion?: string | null;
  bottom: number;
  onCountryPress: () => void;
  onContinentPress?: () => void;
  onWorldPress: () => void;
};

export function MapSpotlightChrome({
  countryName,
  focusedRegion,
  bottom,
  onCountryPress,
  onContinentPress,
  onWorldPress,
}: MapSpotlightChromeProps) {
  const continentLabel = focusedRegion
    ? continentDisplayLabel(focusedRegion)
    : null;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.stack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Back to ${countryName} on map`}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCountryPress();
          }}
          style={({ pressed }) => [styles.countryRow, pressed && styles.pressed]}
        >
          <Ionicons name="location" size={18} color="#fbbf24" />
          <Text style={styles.countryLabel} numberOfLines={1}>
            {countryName}
          </Text>
        </Pressable>

        {continentLabel && onContinentPress ? (
          <>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Back to ${continentLabel} view`}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onContinentPress();
              }}
              style={({ pressed }) => [
                styles.continentRow,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="globe-outline" size={18} color="#fbbf24" />
              <Text style={styles.continentLabel} numberOfLines={1}>
                {continentLabel}
              </Text>
            </Pressable>
          </>
        ) : null}

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
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
  },
  continentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
  countryLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#fbbf24",
  },
  continentLabel: {
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
