import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

type MapDiscoveryChromeProps = {
  count: number;
  bottom: number;
  disabled?: boolean;
  /** Viewport copy uses "in view"; region copy uses the continent name. */
  labelMode?: "viewport" | "region";
  regionLabel?: string;
  onExplorePress: () => void;
};

function resolveDiscoveryLabel(
  count: number,
  labelMode: "viewport" | "region",
  regionLabel?: string,
): string {
  if (labelMode === "region" && regionLabel) {
    return count === 1
      ? `1 country in ${regionLabel}`
      : `${count} countries in ${regionLabel}`;
  }

  return count === 1 ? "1 country in view" : `${count} countries in view`;
}

export function MapDiscoveryChrome({
  count,
  bottom,
  disabled = false,
  labelMode = "viewport",
  regionLabel,
  onExplorePress,
}: MapDiscoveryChromeProps) {
  const label = resolveDiscoveryLabel(count, labelMode, regionLabel);

  const handlePress = () => {
    if (disabled || count === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onExplorePress();
  };

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.card} pointerEvents="auto">
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore countries in this map area"
          accessibilityState={{ disabled: disabled || count === 0 }}
          disabled={disabled || count === 0}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            (disabled || count === 0) && styles.buttonDisabled,
            pressed && !disabled && count > 0 && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>Explore this area</Text>
          <Ionicons name="arrow-forward" size={16} color="#0b132b" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 20,
  },
  card: {
    alignSelf: "center",
    minWidth: "50%",
    maxWidth: "88%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "rgba(18, 24, 38, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    gap: 10,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.88)",
    textAlign: "center",
    flexShrink: 0,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
  pressed: {
    opacity: 0.9,
  },
});
