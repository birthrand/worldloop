import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import {
  SIGN_UP_BUTTON_HEIGHT,
  SIGN_UP_COLORS,
  SIGN_UP_TYPOGRAPHY,
} from "@/constants/sign-up-theme";

type SignUpPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function SignUpPrimaryButton({
  label,
  onPress,
  disabled = false,
}: SignUpPrimaryButtonProps) {
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
    alignSelf: "stretch",
    height: SIGN_UP_BUTTON_HEIGHT,
    borderRadius: SIGN_UP_BUTTON_HEIGHT / 2,
    backgroundColor: SIGN_UP_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  label: {
    color: SIGN_UP_COLORS.primaryText,
    fontFamily: "Poppins-SemiBold",
    fontSize: SIGN_UP_TYPOGRAPHY.button.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.button.lineHeight,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
      default: {},
    }),
  },
});
