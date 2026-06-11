import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View } from "react-native";

import {
  AUTH_BACKGROUND_BLUR_INTENSITY,
  AUTH_BACKGROUND_GRADIENT,
  AUTH_BACKGROUND_WEB_BLUR_FALLBACK,
  AUTH_COLORS,
} from "@/constants/auth-theme";
import { images } from "@/constants/images";

type AuthBackgroundProps = {
  /** Extra vignette over blur + scrim (register screen). */
  showFullGradient?: boolean;
};

export function AuthBackground({
  showFullGradient = false,
}: AuthBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={images.authBackground}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel=""
        accessibilityElementsHidden
      />

      {Platform.OS === "web" ? (
        <View style={styles.webBlurFallback} />
      ) : (
        <BlurView
          intensity={AUTH_BACKGROUND_BLUR_INTENSITY}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}

      <View
        style={[styles.scrim, showFullGradient ? styles.scrimFullScreen : null]}
      />

      {showFullGradient ? (
        <LinearGradient
          colors={AUTH_BACKGROUND_GRADIENT.colors}
          locations={AUTH_BACKGROUND_GRADIENT.locations}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  webBlurFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_BACKGROUND_WEB_BLUR_FALLBACK,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_COLORS.backgroundScrim,
  },
  scrimFullScreen: {
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
});
