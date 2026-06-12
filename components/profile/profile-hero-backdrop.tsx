import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Platform, StyleSheet, View } from "react-native";

import { EXPLORE_FEED_HEADER_BACKDROP_WEB_FALLBACK } from "@/constants/explore-feed-layout";
import { images } from "@/constants/images";
import {
  PROFILE_HERO_BOTTOM_FADE,
  PROFILE_HERO_SCRIM,
  PROFILE_SCREEN_BG,
} from "@/constants/profile-theme";

const PROFILE_HERO_BLUR_INTENSITY = 48;

type GradientViewStyle = {
  experimental_backgroundImage: string;
};

/** Fades hero into the solid profile background below. */
const BOTTOM_FADE_GRADIENT = PROFILE_HERO_BOTTOM_FADE;

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
    backgroundColor: PROFILE_SCREEN_BG,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.06 }],
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EXPLORE_FEED_HEADER_BACKDROP_WEB_FALLBACK,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PROFILE_HERO_SCRIM,
  },
  bottomFade: {
    ...StyleSheet.absoluteFillObject,
  },
});
