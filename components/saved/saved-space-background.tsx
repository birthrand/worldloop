import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import { images } from "@/constants/images";

const STAR_COUNT = 36;

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

export function SavedSpaceBackground() {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => createStars(width, height), [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={images.earthMap}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel=""
        accessibilityElementsHidden
      />

      {Platform.OS === "web" ? (
        <View style={styles.webBlurFallback} />
      ) : (
        <BlurView intensity={96} tint="dark" style={StyleSheet.absoluteFill} />
      )}

      <View style={styles.darkScrim} />
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
    backgroundColor: "rgba(5, 10, 24, 0.82)",
  },
  darkScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 6, 16, 0.78)",
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
