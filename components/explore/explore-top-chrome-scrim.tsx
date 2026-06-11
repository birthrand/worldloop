import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

import {
  EXPLORE_FEED_CHROME_BASE_TINT,
  EXPLORE_FEED_CHROME_SCRIM_FALLBACK,
  EXPLORE_FEED_CHROME_TOP_GRADIENT,
} from "@/constants/explore-feed-layout";

type GradientViewStyle = {
  experimental_backgroundImage: string;
};

type ExploreTopChromeScrimProps = {
  height: number;
};

const HEADER_SCRIM_BLUR_INTENSITY = 52;

/** Frosted fade so header chrome stays readable without blocking the hero image. */
export function ExploreTopChromeScrim({ height }: ExploreTopChromeScrimProps) {
  return (
    <View pointerEvents="none" style={[styles.scrim, { height }]}>
      {Platform.OS === "web" ? (
        <View style={styles.webFallback} />
      ) : (
        <BlurView
          intensity={HEADER_SCRIM_BLUR_INTENSITY}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.baseTint} />
      <View
        style={[
          styles.fadeOverlay,
          {
            experimental_backgroundImage: EXPLORE_FEED_CHROME_TOP_GRADIENT,
          } satisfies GradientViewStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EXPLORE_FEED_CHROME_SCRIM_FALLBACK,
  },
  baseTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EXPLORE_FEED_CHROME_BASE_TINT,
  },
  fadeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
