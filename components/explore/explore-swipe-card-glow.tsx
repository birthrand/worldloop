import { Image } from "expo-image";
import { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";

import {
  EXPLORE_SWIPE_CARD_GLOW_BLUR,
  EXPLORE_SWIPE_CARD_GLOW_SCRIM,
  EXPLORE_SWIPE_CARD_GLOW_SIZE_RATIO,
  EXPLORE_SWIPE_CARD_RADIUS,
  EXPLORE_SWIPE_SCREEN_BG,
} from "@/constants/explore-swipe-layout";
import { getCountryImages } from "@/lib/format-country";
import { normalizeImageUrl } from "@/lib/normalize-image-url";
import type { Country } from "@/types/country";

type ExploreSwipeCardGlowProps = {
  country: Country;
  cardWidth: number;
  cardHeight: number;
};

export function ExploreSwipeCardGlow({
  country,
  cardWidth,
  cardHeight,
}: ExploreSwipeCardGlowProps) {
  const heroUri = useMemo(() => {
    const uri = getCountryImages(country)[0];
    return uri ? normalizeImageUrl(uri) : null;
  }, [country]);

  const glowWidth = Math.round(cardWidth * EXPLORE_SWIPE_CARD_GLOW_SIZE_RATIO);
  const glowHeight = Math.round(
    cardHeight * EXPLORE_SWIPE_CARD_GLOW_SIZE_RATIO,
  );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.glowShell,
        {
          width: glowWidth,
          height: glowHeight,
          borderRadius: EXPLORE_SWIPE_CARD_RADIUS + 8,
        },
      ]}
    >
      {heroUri ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            Platform.OS === "web"
              ? {
                  filter: `blur(${Math.round(EXPLORE_SWIPE_CARD_GLOW_BLUR * 0.5)}px)`,
                }
              : null,
          ]}
        >
          <Image
            source={{ uri: heroUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={
              Platform.OS !== "web" ? EXPLORE_SWIPE_CARD_GLOW_BLUR : undefined
            }
            cachePolicy="memory-disk"
          />
        </View>
      ) : null}

      <View
        style={[
          styles.scrim,
          { backgroundColor: EXPLORE_SWIPE_CARD_GLOW_SCRIM },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glowShell: {
    position: "absolute",
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: EXPLORE_SWIPE_SCREEN_BG,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
});
