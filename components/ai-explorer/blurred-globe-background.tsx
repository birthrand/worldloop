import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Dimensions, Platform, StyleSheet, View } from "react-native";

import { images } from "@/constants/images";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GLOBE_SIZE = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.15;

type GradientViewStyle = {
  experimental_backgroundImage?: string;
};

type BlurredGlobeBackgroundProps = {
  /** Vertical offset for the globe center (0–1 of screen height). */
  centerY?: number;
};

/**
 * Full-screen ambient background — large blurred earth texture behind glass UI.
 */
export function BlurredGlobeBackground({
  centerY = 0.28,
}: BlurredGlobeBackgroundProps) {
  const globeTop = SCREEN_HEIGHT * centerY - GLOBE_SIZE / 2;

  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={[styles.baseFill, styles.navyBase]} />

      <View
        style={[
          styles.globeFrame,
          {
            width: GLOBE_SIZE,
            height: GLOBE_SIZE,
            borderRadius: GLOBE_SIZE / 2,
            top: globeTop,
            left: (SCREEN_WIDTH - GLOBE_SIZE) / 2,
          },
        ]}
      >
        <Image
          source={images.earthTopography}
          style={styles.globeImage}
          contentFit="cover"
          accessibilityLabel=""
          accessibilityElementsHidden
        />
        {Platform.OS === "web" ? (
          <View style={styles.webBlurFallback} />
        ) : (
          <BlurView
            intensity={72}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.globeTint} />
      </View>

      <View
        style={[
          styles.baseFill,
          styles.scrim,
          {
            experimental_backgroundImage:
              "radial-gradient(circle at 50% 28%, rgba(11, 19, 43, 0.15) 0%, rgba(11, 19, 43, 0.72) 52%, rgba(11, 19, 43, 0.94) 100%)",
          } satisfies GradientViewStyle,
        ]}
      />
      <View style={styles.glowAmberBottom} />
      <View style={styles.glowAmberTop} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  baseFill: {
    ...StyleSheet.absoluteFillObject,
  },
  navyBase: {
    backgroundColor: "#0b132b",
  },
  globeFrame: {
    position: "absolute",
    overflow: "hidden",
    opacity: 0.7,
  },
  globeImage: {
    width: "100%",
    height: "100%",
  },
  globeTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 19, 43, 0.2)",
  },
  webBlurFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 19, 43, 0.55)",
  },
  scrim: {
    backgroundColor: "rgba(11, 19, 43, 0.45)",
  },
  glowAmberBottom: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.12,
    left: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: "rgba(251, 191, 36, 0.06)",
  },
  glowAmberTop: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.08,
    right: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: SCREEN_WIDTH * 0.325,
    backgroundColor: "rgba(251, 191, 36, 0.05)",
  },
});
