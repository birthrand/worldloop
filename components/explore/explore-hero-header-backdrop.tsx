import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

import { CountryImage } from "@/components/explore/country-image";

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
const BACKDROP_TINT = "rgba(5, 10, 24, 0.52)";
const BACKDROP_WEB_FALLBACK = "rgba(5, 10, 24, 0.9)";

/** Heavy top band for header chrome legibility over bright photos. */
const BACKDROP_TOP_GRADIENT =
  "linear-gradient(to bottom, rgba(3, 6, 16, 0.88) 0%, rgba(5, 10, 24, 0.68) 32%, rgba(11, 19, 43, 0.34) 58%, rgba(11, 19, 43, 0.08) 82%, rgba(11, 19, 43, 0) 100%)";

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
            experimental_backgroundImage: BACKDROP_TOP_GRADIENT,
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
    backgroundColor: "#0b132b",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.08 }],
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKDROP_WEB_FALLBACK,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BACKDROP_TINT,
  },
  topGradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
