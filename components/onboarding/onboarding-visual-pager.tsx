import { StyleSheet, View } from "react-native";

import { OnboardingBackgroundVideo } from "@/components/onboarding/onboarding-background-video";
import { OnboardingHeroSlide } from "@/components/onboarding/onboarding-hero-slide";
import type { OnboardingSlideData } from "@/data/onboarding-slides";

type OnboardingVisualPagerProps = {
  slide: OnboardingSlideData;
  topInset: number;
  bottomInset: number;
  onNext: () => void;
  onLoginPress: () => void;
};

export function OnboardingVisualPager({
  slide,
  topInset,
  bottomInset,
  onNext,
  onLoginPress,
}: OnboardingVisualPagerProps) {
  return (
    <View style={styles.container}>
      <OnboardingBackgroundVideo />

      <OnboardingHeroSlide
        slide={slide}
        onNext={onNext}
        onLoginPress={onLoginPress}
        topInset={topInset}
        bottomInset={bottomInset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
});
