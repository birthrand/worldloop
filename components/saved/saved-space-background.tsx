import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageStyle,
} from "react-native";

import { images } from "@/constants/images";
import {
  SPACE_BLUR_INTENSITY,
  SPACE_DARK_SCRIM,
  SPACE_WEB_BLUR_FALLBACK,
} from "@/constants/space-theme";

const STAR_COUNT = 36;

type SavedSpaceBackgroundProps = {
  blurIntensity?: number;
  imageScale?: number;
  /** Native image blur — reliably softens the map (BlurView alone often won't). */
  imageBlurRadius?: number;
  scrimColor?: string;
  webBlurFallback?: string;
};

function createStars(width: number, height: number) {
  const stars: {
    id: number;
    top: number;
    left: number;
    size: number;
    opacity: number;
  }[] = [];

  for (let index = 0; index < STAR_COUNT; index += 1) {
    const seed = (index * 9301 + 49297) % 233280;
    const next = (seed * 9301 + 49297) % 233280;
    const third = (next * 9301 + 49297) % 233280;

    stars.push({
      id: index,
      top: (seed / 233280) * height,
      left: (next / 233280) * width,
      size: 1 + (third % 3),
      opacity: 0.18 + (seed % 40) / 100,
    });
  }

  return stars;
}

export function SavedSpaceBackground({
  blurIntensity = SPACE_BLUR_INTENSITY,
  imageScale = 1,
  imageBlurRadius = 0,
  scrimColor = SPACE_DARK_SCRIM,
  webBlurFallback = SPACE_WEB_BLUR_FALLBACK,
}: SavedSpaceBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => createStars(width, height), [width, height]);

  const mapImageStyle: ImageStyle[] = [
    StyleSheet.absoluteFillObject,
    ...(imageScale !== 1 ? [{ transform: [{ scale: imageScale }] }] : []),
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === "web" && imageBlurRadius > 0
            ? {
                // RN web — CSS blur on the map wrapper
                filter: `blur(${Math.round(imageBlurRadius * 0.45)}px)`,
              }
            : null,
        ]}
      >
        <Image
          source={images.earthMap}
          style={mapImageStyle}
          blurRadius={imageBlurRadius > 0 ? imageBlurRadius : undefined}
          contentFit="cover"
          accessibilityLabel=""
          accessibilityElementsHidden
        />
      </View>

      {Platform.OS === "web" ? (
        <View
          style={[styles.webBlurFallback, { backgroundColor: webBlurFallback }]}
        />
      ) : (
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[styles.darkScrim, { backgroundColor: scrimColor }]} />
      <View style={styles.nebulaTop} />
      <View style={styles.nebulaBottom} />

      {stars.map((star) => (
        <View
          key={star.id}
          style={[
            styles.star,
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  webBlurFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  darkScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  nebulaTop: {
    position: "absolute",
    top: "-8%",
    left: "-12%",
    width: "72%",
    height: "42%",
    borderRadius: 999,
    backgroundColor: "rgba(123, 97, 255, 0.05)",
  },
  nebulaBottom: {
    position: "absolute",
    bottom: "-6%",
    right: "-10%",
    width: "58%",
    height: "34%",
    borderRadius: 999,
    backgroundColor: "rgba(45, 212, 191, 0.03)",
  },
  star: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
});
