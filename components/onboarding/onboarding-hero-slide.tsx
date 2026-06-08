import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { OnboardingHeader } from "@/components/onboarding/onboarding-header";
import { OnboardingSlideContent } from "@/components/onboarding/onboarding-slide-content";
import {
  ONBOARDING_BOTTOM_FADE_GRADIENT,
  ONBOARDING_OVERLAY_GRADIENT,
  ONBOARDING_SPACING,
} from "@/constants/onboarding-theme";
import type { OnboardingSlideData } from "@/data/onboarding-slides";

type OnboardingHeroSlideProps = {
  slide: OnboardingSlideData;
  onNext: () => void;
  onLoginPress: () => void;
  topInset: number;
  bottomInset: number;
};

export function OnboardingHeroSlide({
  slide,
  onNext,
  onLoginPress,
  topInset,
  bottomInset,
}: OnboardingHeroSlideProps) {
  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={[...ONBOARDING_OVERLAY_GRADIENT.colors]}
        locations={[...ONBOARDING_OVERLAY_GRADIENT.locations]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={[...ONBOARDING_BOTTOM_FADE_GRADIENT.colors]}
        locations={[...ONBOARDING_BOTTOM_FADE_GRADIENT.locations]}
        pointerEvents="none"
        style={styles.bottomFade}
      />

      <View
        style={[
          styles.header,
          { paddingTop: topInset + ONBOARDING_SPACING.brandTop },
        ]}
      >
        <OnboardingHeader />
      </View>

      <View style={styles.contentFill}>
        <OnboardingSlideContent
          slide={slide}
          onPress={onNext}
          bottomInset={bottomInset}
          showLoginLink
          onLoginPress={onLoginPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  header: {
    zIndex: 1,
    alignItems: "center",
    paddingHorizontal: ONBOARDING_SPACING.screenHorizontal,
  },
  contentFill: {
    flex: 1,
    zIndex: 1,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "68%",
    zIndex: 0,
  },
});
