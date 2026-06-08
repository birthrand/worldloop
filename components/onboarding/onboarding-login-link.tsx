import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";

import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
} from "@/constants/onboarding-theme";

type OnboardingLoginLinkProps = {
  onPress: () => void;
};

export function OnboardingLoginLink({ onPress }: OnboardingLoginLinkProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log in to your account"
      onPress={handlePress}
      style={styles.wrap}
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
    >
      <Text style={styles.prompt}>
        Already have an account? <Text style={styles.link}>Log in</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  prompt: {
    color: ONBOARDING_COLORS.textMuted,
    fontFamily: "Poppins-Regular",
    fontSize: ONBOARDING_TYPOGRAPHY.secondary.fontSize,
    lineHeight: ONBOARDING_TYPOGRAPHY.secondary.lineHeight,
    textAlign: "center",
    flexShrink: 0,
  },
  link: {
    color: ONBOARDING_COLORS.gold,
    fontFamily: "Poppins-SemiBold",
  },
});
