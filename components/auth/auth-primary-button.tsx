import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import {
  AUTH_COLORS,
  AUTH_CTA_HEIGHT,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";

type AuthPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function AuthPrimaryButton({
  label,
  onPress,
  disabled = false,
}: AuthPrimaryButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: AUTH_CTA_HEIGHT,
    borderRadius: AUTH_CTA_HEIGHT / 2,
    backgroundColor: AUTH_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  label: {
    color: AUTH_COLORS.ctaText,
    fontFamily: "Poppins-SemiBold",
    fontSize: AUTH_TYPOGRAPHY.button.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.button.lineHeight,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
      default: {},
    }),
  },
});
