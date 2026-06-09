import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { WORLDLOOP_HEADER_MUTED_COLOR } from "@/components/worldloop-header";

type HapticStyle = "light" | "medium" | "none";

const GLASS_ICON_SIZE = 24;
const GLASS_TOUCH_SIZE = 48;
/** Compact header rail — icon only, no glass circle. */
export const COMPACT_ICON_SIZE = 24;
export const COMPACT_TOUCH_SIZE = 32;
export const COMPACT_ICON_SIZE_SMALL = 18;
export const COMPACT_TOUCH_SIZE_SMALL = 26;
export const COMPACT_ICON_EDGE_INSET =
  (COMPACT_TOUCH_SIZE - COMPACT_ICON_SIZE) / 2;

const COMPACT_ICON_COLOR = WORLDLOOP_HEADER_MUTED_COLOR;
const COMPACT_ICON_BRIGHT_COLOR = "rgba(255, 255, 255, 0.9)";

type GlassIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: HapticStyle;
  /** `plain` | `compact` = icon only; `glass` = icon in glass circle + label. */
  variant?: "glass" | "plain" | "compact";
  /** Slightly brighter icons for compact controls on dark toolbars. */
  iconTone?: "muted" | "bright";
  /** Glass variant only — hide caption under the circle. */
  iconOnly?: boolean;
  /** Compact variant only — smaller icon and touch target. */
  compactSize?: "default" | "small";
  /** Override icon pixel size for plain / compact variants. */
  iconSize?: number;
};

function triggerHaptic(style: HapticStyle) {
  if (style === "none") return;
  const feedback =
    style === "medium"
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light;
  void Haptics.impactAsync(feedback);
}

export function GlassIconButton({
  icon,
  label,
  onPress,
  active = false,
  activeColor = "#fbbf24",
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  haptic = "light",
  variant = "glass",
  iconTone = "muted",
  iconOnly = false,
  compactSize = "default",
  iconSize: iconSizeOverride,
}: GlassIconButtonProps) {
  const isSmallCompact = variant === "compact" && compactSize === "small";
  const compactIconSize =
    iconSizeOverride ??
    (isSmallCompact ? COMPACT_ICON_SIZE_SMALL : COMPACT_ICON_SIZE);
  const compactTouchSize = isSmallCompact
    ? COMPACT_TOUCH_SIZE_SMALL
    : COMPACT_TOUCH_SIZE;
  const plainTouchSize = iconSizeOverride != null ? 44 : GLASS_TOUCH_SIZE;

  const compactIconColor =
    iconTone === "bright" ? COMPACT_ICON_BRIGHT_COLOR : COMPACT_ICON_COLOR;

  const iconColor = disabled
    ? "rgba(255, 255, 255, 0.4)"
    : active
      ? activeColor
      : variant === "glass"
        ? "#ffffff"
        : iconTone === "bright"
          ? "#ffffff"
          : compactIconColor;

  const handlePress = () => {
    if (disabled) return;
    triggerHaptic(haptic);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        variant === "glass"
          ? styles.hitArea
          : variant === "plain"
            ? [
                styles.hitAreaPlain,
                { minWidth: plainTouchSize, minHeight: plainTouchSize },
              ]
            : [
                styles.hitAreaCompact,
                { minWidth: compactTouchSize, minHeight: compactTouchSize },
              ],
        disabled && styles.hitAreaDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {variant === "glass" ? (
        <View
          style={[
            styles.circle,
            active && !disabled && styles.circleActive,
            disabled && styles.circleDisabled,
          ]}
        >
          <Ionicons name={icon} size={GLASS_ICON_SIZE} color={iconColor} />
        </View>
      ) : (
        <Ionicons
          name={icon}
          size={
            variant === "compact" || variant === "plain"
              ? compactIconSize
              : GLASS_ICON_SIZE
          }
          color={iconColor}
        />
      )}
      {variant === "glass" && !iconOnly ? (
        <Text
          style={[
            styles.label,
            active && !disabled && { color: activeColor },
            disabled && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    alignItems: "center",
    minWidth: GLASS_TOUCH_SIZE,
    minHeight: GLASS_TOUCH_SIZE,
    gap: 4,
  },
  hitAreaCompact: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: COMPACT_TOUCH_SIZE,
    minHeight: COMPACT_TOUCH_SIZE,
  },
  hitAreaPlain: {
    alignItems: "center",
    justifyContent: "center",
  },
  hitAreaDisabled: {
    opacity: 0.72,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
  circle: {
    width: GLASS_TOUCH_SIZE,
    height: GLASS_TOUCH_SIZE,
    borderRadius: GLASS_TOUCH_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  circleActive: {
    backgroundColor: "rgba(251, 191, 36, 0.18)",
    borderColor: "rgba(251, 191, 36, 0.45)",
  },
  circleDisabled: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  label: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
  labelDisabled: {
    color: "rgba(255, 255, 255, 0.45)",
  },
});
