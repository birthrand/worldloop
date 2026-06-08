import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  ONBOARDING_COLORS,
  ONBOARDING_CTA_HEIGHT,
  ONBOARDING_TYPOGRAPHY,
} from "@/constants/onboarding-theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type OnboardingCtaVariant = "gold" | "blue";

type OnboardingCtaProps = {
  label: string;
  onPress: () => void;
  variant?: OnboardingCtaVariant;
};

export function OnboardingCta({
  label,
  onPress,
  variant = "gold",
}: OnboardingCtaProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (variant === "blue") {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, styles.buttonBlue, animatedStyle]}
      >
        <Text style={styles.blueLabel}>{label}</Text>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, styles.buttonGold, animatedStyle]}
    >
      <Text style={styles.goldLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    borderRadius: ONBOARDING_CTA_HEIGHT / 2,
    overflow: "hidden",
  },
  buttonGold: {
    height: ONBOARDING_CTA_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ONBOARDING_COLORS.gold,
    paddingHorizontal: 24,
  },
  buttonBlue: {
    height: ONBOARDING_CTA_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
  },
  blueLabel: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
    fontSize: ONBOARDING_TYPOGRAPHY.cta.fontSize,
    lineHeight: ONBOARDING_TYPOGRAPHY.cta.lineHeight,
  },
  goldLabel: {
    color: ONBOARDING_COLORS.ctaText,
    fontFamily: "Poppins-SemiBold",
    fontSize: ONBOARDING_TYPOGRAPHY.cta.fontSize,
    lineHeight: ONBOARDING_TYPOGRAPHY.cta.lineHeight,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
      default: {},
    }),
  },
});
