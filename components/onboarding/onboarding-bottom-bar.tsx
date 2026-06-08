import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { OnboardingCta } from "@/components/onboarding/onboarding-cta";
import { OnboardingHeadline } from "@/components/onboarding/onboarding-headline";
import { OnboardingPagination } from "@/components/onboarding/onboarding-pagination";
import { getOnboardingContentBottom } from "@/constants/onboarding-theme";
import type { OnboardingSlideData } from "@/data/onboarding-slides";

type OnboardingBottomBarProps = {
  slide: OnboardingSlideData;
  slideCount: number;
  activeIndex: number;
  ctaLabel: string;
  onCtaPress: () => void;
  bottomInset: number;
};

export function OnboardingBottomBar({
  slide,
  slideCount,
  activeIndex,
  ctaLabel,
  onCtaPress,
  bottomInset,
}: OnboardingBottomBarProps) {
  const { height } = useWindowDimensions();
  const contentBottom = getOnboardingContentBottom(bottomInset, height);

  return (
    <View style={[styles.bar, { paddingBottom: contentBottom }]}>
      {slideCount > 1 ? (
        <OnboardingPagination count={slideCount} activeIndex={activeIndex} />
      ) : null}
      <OnboardingHeadline lines={slide.headlineLines} />
      <Text style={styles.subheadline}>{slide.subheadline}</Text>
      <View style={styles.ctaWrap}>
        <OnboardingCta label={ctaLabel} onPress={onCtaPress} />
      </View>
      {slide.secondaryCta ? (
        <Text style={styles.secondary}>{slide.secondaryCta}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 24,
    gap: 0,
    alignItems: "center",
  },
  headline: {
    color: "#FFFFFF",
    fontFamily: "Poppins-Bold",
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: "center",
    maxWidth: 320,
  },
  subheadline: {
    color: "#CBD5E1",
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 20,
    textAlign: "center",
  },
  ctaWrap: {
    width: "100%",
    maxWidth: 320,
  },
  secondary: {
    color: "#94A3B8",
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 10,
  },
});
