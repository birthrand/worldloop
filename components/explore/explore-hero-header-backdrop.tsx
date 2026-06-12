import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

import { CountryImage } from "@/components/explore/country-image";
import {
  EXPLORE_FEED_BODY_BG,
  EXPLORE_FEED_HEADER_BACKDROP_GRADIENT,
  EXPLORE_FEED_HEADER_BACKDROP_TINT,
  EXPLORE_FEED_HEADER_BACKDROP_WEB_FALLBACK,
} from "@/constants/explore-feed-layout";

type GradientViewStyle = {
  experimental_backgroundImage: string;
};

type ExploreHeroHeaderBackdropProps = {
  height: number;
  imageUri?: string;
  flag: string;
  iso2?: string;
};

const BACKDROP_BLUR_INTENSITY = 56;

/** Blurred hero imagery fixed behind the explore header chrome. */
export function ExploreHeroHeaderBackdrop({
  height,
  imageUri,
  flag,
  iso2,
}: ExploreHeroHeaderBackdropProps) {
  return (
    <View pointerEvents="none" style={[styles.shell, { height }]}>
      <CountryImage
        uri={imageUri}
        flag={flag}
        iso2={iso2}
        style={styles.image}
        contentFit="cover"
        contentPosition="top"
      />
      {Platform.OS === "web" ? (
        <View style={styles.webFallback} />
      ) : (
        <BlurView
          intensity={BACKDROP_BLUR_INTENSITY}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.tint} />
      <View
        style={[
          styles.topGradient,
          {
            experimental_backgroundImage: EXPLORE_FEED_HEADER_BACKDROP_GRADIENT,
          } satisfies GradientViewStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: EXPLORE_FEED_BODY_BG,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.08 }],
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EXPLORE_FEED_HEADER_BACKDROP_WEB_FALLBACK,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EXPLORE_FEED_HEADER_BACKDROP_TINT,
  },
  topGradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
