import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { COUNTRY_DETAIL_MODULE_BG } from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
} from "@/constants/explore-swipe-layout";
import { images } from "@/constants/images";
import { formatCoordinates } from "@/lib/format-country";
import {
  getMapDisplayLatLng,
  isValidLatLng,
  latLngToEquirectangularCoverCenteredLayout,
} from "@/lib/map-country";
import type { Country } from "@/types/country";

const MODULE_HEIGHT = 132;
const PIN_SIZE = 28;

type CountryLocationMapProps = {
  country: Pick<Country, "name" | "latlng" | "flag" | "cca2">;
  onPress: () => void;
};

function PulsingLocationPin() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.45, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: Math.max(0.15, 1.35 - pulse.value),
  }));

  return (
    <View style={styles.pinAnchor} pointerEvents="none">
      <Animated.View style={[styles.pinRing, ringStyle]} />
      <View style={styles.pinDot} />
    </View>
  );
}

export function CountryLocationMap({
  country,
  onPress,
}: CountryLocationMapProps) {
  const [mapLayout, setMapLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const hasCoordinates = isValidLatLng(country.latlng);
  const [latitude, longitude] = hasCoordinates
    ? getMapDisplayLatLng(country)
    : ([0, 0] as [number, number]);
  const coordinatesLabel = hasCoordinates
    ? formatCoordinates([latitude, longitude])
    : "";
  const mapLayoutMetrics = useMemo(() => {
    if (!hasCoordinates || !mapLayout) return null;

    return latLngToEquirectangularCoverCenteredLayout(
      latitude,
      longitude,
      mapLayout.width,
      mapLayout.height,
    );
  }, [hasCoordinates, latitude, longitude, mapLayout]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapLayout((current) =>
      current?.width === width && current?.height === height
        ? current
        : { width, height },
    );
  };

  if (!hasCoordinates) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show ${country.name} on map`}
      onPress={onPress}
      onLayout={handleLayout}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
    >
      {mapLayoutMetrics ? (
        <Image
          source={images.earthMap}
          style={[
            styles.mapImage,
            {
              width: mapLayoutMetrics.imageWidth,
              height: mapLayoutMetrics.imageHeight,
              left: mapLayoutMetrics.imageLeft,
              top: mapLayoutMetrics.imageTop,
            },
          ]}
          contentFit="cover"
          accessibilityLabel={`${country.name} region outline`}
        />
      ) : (
        <Image
          source={images.earthMap}
          style={[styles.mapImage, styles.mapImageFallback]}
          contentFit="cover"
          accessibilityLabel={`${country.name} region outline`}
        />
      )}
      <View style={styles.mapTint} pointerEvents="none" />
      <PulsingLocationPin />
      <View style={styles.captionRow} pointerEvents="none">
        <Text style={styles.captionLabel}>Coordinates</Text>
        <Text style={styles.captionValue}>{coordinatesLabel}</Text>
      </View>
      <Text style={styles.mapLink}>View on map</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: MODULE_HEIGHT,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  wrapPressed: {
    opacity: 0.92,
  },
  mapImage: {
    position: "absolute",
    opacity: 0.7,
  },
  mapImageFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },
  pinAnchor: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: PIN_SIZE,
    height: PIN_SIZE,
    marginTop: -(PIN_SIZE / 2),
    marginLeft: -(PIN_SIZE / 2),
    alignItems: "center",
    justifyContent: "center",
  },
  pinRing: {
    position: "absolute",
    width: 26,
    height: 26,
    top: (PIN_SIZE - 26) / 2,
    left: (PIN_SIZE - 26) / 2,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: AI_EXPLORER_THEME.accentMuted,
    backgroundColor: AI_EXPLORER_THEME.accentSoft,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: EXPLORE_SWIPE_ACCENT_COLOR,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  captionRow: {
    position: "absolute",
    left: 12,
    bottom: 10,
    gap: 1,
  },
  captionLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
  captionValue: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  mapLink: {
    position: "absolute",
    right: 12,
    bottom: 12,
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: EXPLORE_SWIPE_ACCENT_COLOR,
  },
});
