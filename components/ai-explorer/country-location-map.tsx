import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { images } from "@/constants/images";
import { formatCoordinates } from "@/lib/format-country";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import type { Country } from "@/types/country";

const MODULE_HEIGHT = 132;

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
  if (!isValidLatLng(country.latlng)) {
    return null;
  }

  const [latitude, longitude] = getMapDisplayLatLng(country);
  const coordinatesLabel = formatCoordinates([latitude, longitude]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show ${country.name} on map`}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
    >
      <Image
        source={images.earthMap}
        style={styles.mapImage}
        contentFit="cover"
        accessibilityLabel={`${country.name} region outline`}
      />
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
    backgroundColor: AI_EXPLORER_THEME.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AI_EXPLORER_THEME.divider,
  },
  wrapPressed: {
    opacity: 0.92,
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  pinAnchor: {
    position: "absolute",
    top: "34%",
    left: "44%",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pinRing: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: AI_EXPLORER_THEME.accentMuted,
    backgroundColor: AI_EXPLORER_THEME.accentSoft,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AI_EXPLORER_THEME.accent,
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
    color: AI_EXPLORER_THEME.textMuted,
  },
  captionValue: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: AI_EXPLORER_THEME.textPrimary,
  },
  mapLink: {
    position: "absolute",
    right: 12,
    bottom: 12,
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: AI_EXPLORER_THEME.accent,
  },
});
