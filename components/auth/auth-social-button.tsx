import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";

import {
  AUTH_COLORS,
  AUTH_SOCIAL_HEIGHT,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";

type AuthSocialProvider = "google" | "facebook";

type AuthSocialButtonProps = {
  provider: AuthSocialProvider;
  onPress?: () => void;
};

const PROVIDER_CONFIG = {
  google: {
    label: "Google",
    icon: "logo-google" as const,
    color: AUTH_COLORS.google,
  },
  facebook: {
    label: "Facebook",
    icon: "logo-facebook" as const,
    color: AUTH_COLORS.facebook,
  },
};

export function AuthSocialButton({ provider, onPress }: AuthSocialButtonProps) {
  const config = PROVIDER_CONFIG[provider];

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${config.label}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons name={config.icon} size={20} color={config.color} />
      <Text style={styles.label}>{config.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: AUTH_SOCIAL_HEIGHT,
    borderRadius: AUTH_SOCIAL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: AUTH_COLORS.socialBorder,
    backgroundColor: AUTH_COLORS.socialBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  buttonPressed: {
    opacity: 0.92,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  label: {
    color: AUTH_COLORS.socialText,
    fontFamily: "Poppins-SemiBold",
    fontSize: AUTH_TYPOGRAPHY.social.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.social.lineHeight,
  },
});
