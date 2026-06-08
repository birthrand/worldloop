import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { OnboardingCta } from "@/components/onboarding/onboarding-cta";
import { OnboardingHeadline } from "@/components/onboarding/onboarding-headline";
import { OnboardingHeadlineDivider } from "@/components/onboarding/onboarding-headline-divider";
import { OnboardingLoginLink } from "@/components/onboarding/onboarding-login-link";
import {
  ONBOARDING_COLORS,
  ONBOARDING_SPACING,
  ONBOARDING_TYPOGRAPHY,
  getOnboardingContentBottom,
} from "@/constants/onboarding-theme";
import type { OnboardingSlideData } from "@/data/onboarding-slides";

type OnboardingSlideContentProps = {
  slide: OnboardingSlideData;
  onPress: () => void;
  bottomInset: number;
  hideSubheadline?: boolean;
  showLoginLink?: boolean;
  onLoginPress?: () => void;
};

export function OnboardingSlideContent({
  slide,
  onPress,
  bottomInset,
  hideSubheadline = false,
  showLoginLink = false,
  onLoginPress,
}: OnboardingSlideContentProps) {
  const { height } = useWindowDimensions();
  const contentBottom = getOnboardingContentBottom(bottomInset, height);
  const showSubheadline = !hideSubheadline && slide.subheadline.length > 0;

  return (
    <View style={styles.content}>
      <View style={styles.topSpacer} />

      <View style={styles.copyBlock}>
        <OnboardingHeadline lines={slide.headlineLines} />
        <View style={styles.dividerWrap}>
          <OnboardingHeadlineDivider />
        </View>
        {showSubheadline ? (
          <Text style={styles.subheadline}>{slide.subheadline}</Text>
        ) : null}
      </View>

      <View
        style={[
          styles.actionZone,
          {
            paddingBottom: contentBottom,
            marginTop: ONBOARDING_SPACING.copyToCta,
          },
        ]}
      >
        <OnboardingCta label={slide.ctaLabel} onPress={onPress} />
        {showLoginLink && onLoginPress ? (
          <OnboardingLoginLink onPress={onLoginPress} />
        ) : null}
      </View>
    </View>
  );
}

export const onboardingSlideContentStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: ONBOARDING_SPACING.screenHorizontal,
    alignItems: "center",
  },
  topSpacer: {
    flex: 1,
    minHeight: 24,
  },
  copyBlock: {
    width: "100%",
    maxWidth: ONBOARDING_SPACING.contentMaxWidth,
    alignItems: "center",
  },
  dividerWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: ONBOARDING_SPACING.headlineToDivider,
  },
  subheadline: {
    color: ONBOARDING_COLORS.textMuted,
    fontFamily: "Poppins-Regular",
    fontSize: ONBOARDING_TYPOGRAPHY.subheadline.fontSize,
    lineHeight: ONBOARDING_TYPOGRAPHY.subheadline.lineHeight,
    textAlign: "center",
    marginTop: ONBOARDING_SPACING.dividerToSubheadline,
  },
  actionZone: {
    width: "100%",
    maxWidth: ONBOARDING_SPACING.contentMaxWidth,
    alignItems: "center",
    gap: ONBOARDING_SPACING.ctaToLogin,
  },
});

const styles = onboardingSlideContentStyles;
