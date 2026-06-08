import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { OnboardingPagination } from "@/components/onboarding/onboarding-pagination";
import { OnboardingPreviewCard } from "@/components/onboarding/onboarding-preview-card";
import { OnboardingSlideContent } from "@/components/onboarding/onboarding-slide-content";
import { ONBOARDING_OVERLAY_GRADIENT } from "@/constants/onboarding-theme";
import type { OnboardingSlideData } from "@/data/onboarding-slides";

type OnboardingPreviewSlideProps = {
  slide: OnboardingSlideData;
  slideCount: number;
  activeIndex: number;
  bottomInset: number;
  onNext: () => void;
  onLoginPress: () => void;
};

export function OnboardingPreviewSlide({
  slide,
  slideCount,
  activeIndex,
  bottomInset,
  onNext,
  onLoginPress,
}: OnboardingPreviewSlideProps) {
  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={[...ONBOARDING_OVERLAY_GRADIENT.colors]}
        locations={[...ONBOARDING_OVERLAY_GRADIENT.locations]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.contentFill}>
        <View style={styles.heroZone}>
          <OnboardingPreviewCard />
        </View>

        <View style={styles.bottomBlock}>
          {slideCount > 1 ? (
            <OnboardingPagination
              count={slideCount}
              activeIndex={activeIndex}
            />
          ) : null}

          <OnboardingSlideContent
            slide={slide}
            onPress={onNext}
            bottomInset={bottomInset}
            showLoginLink
            onLoginPress={onLoginPress}
          />
        </View>
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
  contentFill: {
    flex: 1,
    justifyContent: "flex-end",
  },
  heroZone: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  bottomBlock: {
    gap: 4,
  },
});
