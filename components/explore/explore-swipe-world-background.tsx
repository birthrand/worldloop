import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";

import {
  EXPLORE_SWIPE_GHOST_BLUR,
  EXPLORE_SWIPE_GHOST_BLUR_INTENSITY,
  EXPLORE_SWIPE_GHOST_PALETTE_OPACITY,
  EXPLORE_SWIPE_WORLD_BASE_DIM,
  EXPLORE_SWIPE_WORLD_BG_BOTTOM,
  EXPLORE_SWIPE_WORLD_BG_TOP,
  EXPLORE_SWIPE_WORLD_WASH_SCRIM,
} from "@/constants/explore-swipe-layout";
import { getCountryImages } from "@/lib/format-country";
import { normalizeImageUrl } from "@/lib/normalize-image-url";
import type { Country } from "@/types/country";

type ExploreSwipeWorldBackgroundProps = {
  /** Active card — drives the muted transition wash (Layer 2). */
  paletteCountry?: Country;
};

/**
 * Explore motion environment — base gradient + muted hero wash.
 * Layer 1: deep neutral world gradient
 * Layer 2: desaturated, heavily darkened hero tones from the active card
 */
export function ExploreSwipeWorldBackground({
  paletteCountry,
}: ExploreSwipeWorldBackgroundProps) {
  const heroUri = useMemo(() => {
    if (!paletteCountry) return null;
    const uri = getCountryImages(paletteCountry)[0];
    return uri ? normalizeImageUrl(uri) : null;
  }, [paletteCountry]);

  return (
    <View style={styles.root} pointerEvents="none">
      <LinearGradient
        colors={[EXPLORE_SWIPE_WORLD_BG_TOP, EXPLORE_SWIPE_WORLD_BG_BOTTOM]}
        style={StyleSheet.absoluteFillObject}
      />

      {heroUri ? (
        <>
          <View
            style={[
              StyleSheet.absoluteFillObject,
              Platform.OS === "web"
                ? {
                    filter: `blur(${Math.round(EXPLORE_SWIPE_GHOST_BLUR * 0.55)}px)`,
                  }
                : null,
            ]}
          >
            <Image
              source={{ uri: heroUri }}
              style={[
                StyleSheet.absoluteFillObject,
                { opacity: EXPLORE_SWIPE_GHOST_PALETTE_OPACITY },
              ]}
              contentFit="cover"
              blurRadius={
                Platform.OS !== "web" ? EXPLORE_SWIPE_GHOST_BLUR : undefined
              }
              cachePolicy="memory-disk"
            />
          </View>

          {Platform.OS === "web" ? (
            <View style={styles.webWashBlur} />
          ) : (
            <BlurView
              intensity={EXPLORE_SWIPE_GHOST_BLUR_INTENSITY}
              tint="dark"
              style={StyleSheet.absoluteFillObject}
            />
          )}

          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: EXPLORE_SWIPE_WORLD_WASH_SCRIM },
            ]}
          />
        </>
      ) : null}

      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: EXPLORE_SWIPE_WORLD_BASE_DIM },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: "hidden",
  },
  webWashBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 9, 12, 0.68)",
  },
});
