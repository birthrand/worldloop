import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Platform, StyleSheet, View } from "react-native";

import { images } from "@/constants/images";
import { SPACE_WEB_BLUR_FALLBACK } from "@/constants/space-theme";

const PROFILE_HERO_BLUR_INTENSITY = 48;

type GradientViewStyle = {
  experimental_backgroundImage: string;
};

/** Fades hero into the solid profile background below. */
const BOTTOM_FADE_GRADIENT =
  "linear-gradient(to bottom, rgba(11, 19, 43, 0) 0%, rgba(11, 19, 43, 0.35) 55%, rgba(11, 19, 43, 0.92) 88%, #0b132b 100%)";

type ProfileHeroBackdropProps = {
  height: number;
};

export function ProfileHeroBackdrop({ height }: ProfileHeroBackdropProps) {
  return (
    <View pointerEvents="none" style={[styles.shell, { height }]}>
      <Image
        source={images.profileHero}
        style={styles.image}
        contentFit="cover"
        accessibilityLabel="Profile hero background"
      />
      {Platform.OS === "web" ? (
        <View style={styles.webFallback} />
      ) : (
        <BlurView
          intensity={PROFILE_HERO_BLUR_INTENSITY}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.scrim} />
      <View
        style={[
          styles.bottomFade,
          {
            experimental_backgroundImage: BOTTOM_FADE_GRADIENT,
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
    transform: [{ scale: 1.06 }],
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPACE_WEB_BLUR_FALLBACK,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 19, 43, 0.38)",
  },
  bottomFade: {
    ...StyleSheet.absoluteFillObject,
  },
});
