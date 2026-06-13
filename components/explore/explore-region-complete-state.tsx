import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_RADIUS,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_HEADER,
} from "@/constants/explore-swipe-layout";
import {
  adjacentContinent,
  continentDisplayLabel,
  isContinent,
  type Continent,
} from "@/constants/regions";

type ExploreRegionCompleteStateProps = {
  region: Continent;
  cardWidth: number;
  cardHeight: number;
  onContinue: (nextRegion: Continent) => void;
};

export function ExploreRegionCompleteState({
  region,
  cardWidth,
  cardHeight,
  onContinue,
}: ExploreRegionCompleteStateProps) {
  const regionLabel = continentDisplayLabel(region);
  const nextRegion = adjacentContinent(region, "next");
  const nextLabel = nextRegion ? continentDisplayLabel(nextRegion) : null;

  const handleContinue = () => {
    if (!nextRegion || !isContinent(nextRegion)) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinue(nextRegion);
  };

  return (
    <View
      style={[styles.shell, { width: cardWidth, height: cardHeight }]}
      accessibilityLabel={`${regionLabel} complete`}
    >
      <Text style={styles.title}>{regionLabel} complete</Text>
      <Text style={styles.subtitle}>
        You&apos;ve swiped through every country in {regionLabel}.
      </Text>
      {nextRegion && nextLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue to ${nextLabel}`}
          onPress={handleContinue}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>Continue to {nextLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: EXPLORE_SWIPE_CARD_RADIUS,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_TEXT_HEADER,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
    textAlign: "center",
  },
  cta: {
    marginTop: 8,
    backgroundColor: EXPLORE_SWIPE_ACCENT_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: "center",
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    fontFamily: "Poppins-SemiBold",
    color: "#000000",
    textAlign: "center",
  },
});
