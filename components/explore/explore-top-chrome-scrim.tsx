import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

type GradientViewStyle = {
  experimental_backgroundImage: string;
};

type ExploreTopChromeScrimProps = {
  height: number;
};

const HEADER_SCRIM_BLUR_INTENSITY = 52;
const HEADER_SCRIM_WEB_FALLBACK = "rgba(5, 10, 24, 0.88)";

/** Dense top band keeps logo and icons legible on bright hero photos. */
const HEADER_SCRIM_TOP_GRADIENT =
  "linear-gradient(to bottom, rgba(3, 6, 16, 0.82) 0%, rgba(5, 10, 24, 0.62) 38%, rgba(11, 19, 43, 0.28) 68%, rgba(11, 19, 43, 0) 100%)";

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
            experimental_backgroundImage: HEADER_SCRIM_TOP_GRADIENT,
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
    backgroundColor: HEADER_SCRIM_WEB_FALLBACK,
  },
  baseTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 6, 16, 0.28)",
  },
  fadeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
