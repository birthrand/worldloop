import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";

import {
  AUTH_COLORS,
  AUTH_CTA_HEIGHT,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";

type AuthAppleButtonProps = {
  onPress?: () => void;
};

export function AuthAppleButton({ onPress }: AuthAppleButtonProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons name="logo-apple" size={20} color={AUTH_COLORS.textPrimary} />
      <Text style={styles.label}>Continue with Apple</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: AUTH_CTA_HEIGHT,
    borderRadius: AUTH_CTA_HEIGHT / 2,
    borderWidth: 1,
    borderColor: AUTH_COLORS.socialBorder,
    backgroundColor: AUTH_COLORS.socialBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  buttonPressed: {
    backgroundColor: AUTH_COLORS.socialBgPressed,
    borderColor: AUTH_COLORS.socialBorderPressed,
    transform: [{ scale: 0.98 }],
  },
  label: {
    color: AUTH_COLORS.textPrimary,
    fontFamily: "Poppins-Medium",
    fontSize: AUTH_TYPOGRAPHY.button.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.button.lineHeight,
  },
});
