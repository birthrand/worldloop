import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GoogleLogoIcon } from "@/components/auth/sign-up/google-logo-icon";
import {
  SIGN_UP_COLORS,
  SIGN_UP_SOCIAL_HEIGHT,
  SIGN_UP_TYPOGRAPHY,
} from "@/constants/sign-up-theme";

type SignUpSocialProvider = "google" | "apple";

type SignUpSocialButtonProps = {
  provider: SignUpSocialProvider;
  onPress?: () => void;
  disabled?: boolean;
};

const SOCIAL_ICON_SIZE = 18;
const GOOGLE_ICON_SIZE = 16;

const PROVIDER_CONFIG = {
  google: {
    label: "Continue with Google",
  },
  apple: {
    label: "Continue with Apple",
    icon: "logo-apple" as const,
  },
};

export function SignUpSocialButton({
  provider,
  onPress,
  disabled = false,
}: SignUpSocialButtonProps) {
  const config = PROVIDER_CONFIG[provider];

  const handlePress = () => {
    if (disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <View style={styles.content}>
        {provider === "google" ? (
          <GoogleLogoIcon size={GOOGLE_ICON_SIZE} />
        ) : (
          <Ionicons
            name={PROVIDER_CONFIG.apple.icon}
            size={SOCIAL_ICON_SIZE}
            color={SIGN_UP_COLORS.socialText}
          />
        )}
        <Text style={styles.label}>{config.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "stretch",
    height: SIGN_UP_SOCIAL_HEIGHT,
    borderRadius: SIGN_UP_SOCIAL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: SIGN_UP_COLORS.socialBorder,
    backgroundColor: SIGN_UP_COLORS.socialBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonPressed: {
    backgroundColor: SIGN_UP_COLORS.socialBgPressed,
    borderColor: SIGN_UP_COLORS.socialBorderPressed,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    color: SIGN_UP_COLORS.socialText,
    fontFamily: "Poppins-Regular",
    fontSize: SIGN_UP_TYPOGRAPHY.social.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.social.lineHeight,
  },
});
