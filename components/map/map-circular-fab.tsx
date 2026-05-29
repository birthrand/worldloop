import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { MAP_CIRCULAR_FAB } from "@/constants/map-chrome-styles";

type MapCircularFabVariant = "control" | "accent";

type MapCircularFabProps = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: { expanded?: boolean; selected?: boolean; disabled?: boolean };
  onPress: () => void;
  variant?: MapCircularFabVariant;
  deemphasized?: boolean;
  disabled?: boolean;
};

export function MapCircularFab({
  icon,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  onPress,
  variant = "control",
  deemphasized = false,
  disabled = false,
}: MapCircularFabProps) {
  const isAccent = variant === "accent";
  const size = isAccent ? MAP_CIRCULAR_FAB.accentSize : MAP_CIRCULAR_FAB.controlSize;
  const borderRadius = isAccent
    ? MAP_CIRCULAR_FAB.accentBorderRadius
    : MAP_CIRCULAR_FAB.controlBorderRadius;
  const iconSize = isAccent
    ? MAP_CIRCULAR_FAB.accentIconSize
    : MAP_CIRCULAR_FAB.controlIconSize;
  const iconColor = isAccent
    ? MAP_CIRCULAR_FAB.accentIconColor
    : MAP_CIRCULAR_FAB.controlIconColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          width: size,
          height: size,
          borderRadius,
        },
        isAccent ? styles.fabAccent : styles.fabControl,
        deemphasized && styles.fabDeemphasized,
        pressed && !disabled && (isAccent ? styles.pressedAccent : styles.pressedControl),
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabControl: {
    backgroundColor: MAP_CIRCULAR_FAB.controlBackgroundColor,
    borderWidth: 1,
    borderColor: MAP_CIRCULAR_FAB.controlBorderColor,
  },
  fabAccent: {
    backgroundColor: MAP_CIRCULAR_FAB.accentBackgroundColor,
    borderWidth: 1,
    borderColor: MAP_CIRCULAR_FAB.accentBorderColor,
    shadowColor: MAP_CIRCULAR_FAB.accentBorderColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  fabDeemphasized: {
    opacity: 0.88,
  },
  pressedControl: {
    opacity: 0.92,
    backgroundColor: MAP_CIRCULAR_FAB.controlPressedBackgroundColor,
  },
  pressedAccent: {
    opacity: 0.95,
    backgroundColor: MAP_CIRCULAR_FAB.accentPressedBackground,
  },
});
