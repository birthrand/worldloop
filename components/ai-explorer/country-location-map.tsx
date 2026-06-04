import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { MAP_DARK_STYLE } from "@/constants/map-dark-style";
import { resolveFlagCdnUrl } from "@/lib/flag-url";
import { getMapDisplayLatLng, isValidLatLng } from "@/lib/map-country";
import type { Country } from "@/types/country";

const MAP_HEIGHT = 148;
/** Tighter zoom so the country sits in the middle of the preview. */
const LAT_DELTA = 8;
const FLAG_SIZE = 32;

function longitudeDeltaForLatitude(latitude: number): number {
  const radians = (latitude * Math.PI) / 180;
  const adjusted = LAT_DELTA * Math.cos(radians);
  return Math.max(adjusted, 4);
}

type FlagMapMarkerProps = {
  flag: string;
  iso2: string;
};

function FlagMapMarker({ flag, iso2 }: FlagMapMarkerProps) {
  const pulse = useSharedValue(1);
  const flagUri = resolveFlagCdnUrl(flag, iso2);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.55, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const innerGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: Math.max(0.2, 1.1 - pulse.value),
  }));

  const outerGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value * 1.25 }],
    opacity: Math.max(0.08, 0.55 - pulse.value * 0.2),
  }));

  return (
    <View style={styles.markerAnchor} pointerEvents="none">
      <Animated.View style={[styles.glowRingOuter, outerGlowStyle]} />
      <Animated.View style={[styles.glowRingInner, innerGlowStyle]} />
      <View style={styles.flagCircle}>
        {flagUri ? (
          <Image
            source={{ uri: flagUri }}
            style={styles.flagImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel="Country flag on map"
          />
        ) : (
          <Text style={styles.flagFallback}>🏳️</Text>
        )}
      </View>
    </View>
  );
}

type CountryLocationMapProps = {
  country: Pick<Country, "name" | "latlng" | "flag" | "cca2">;
  onPress: () => void;
};

export function CountryLocationMap({
  country,
  onPress,
}: CountryLocationMapProps) {
  const [latitude, longitude] = getMapDisplayLatLng(country);
  const hasValidCoords = isValidLatLng(country.latlng);

  if (!hasValidCoords) {
    return null;
  }

  const longitudeDelta = longitudeDeltaForLatitude(latitude);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show ${country.name} on map`}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
    >
      <MapView
        style={styles.map}
        customMapStyle={MAP_DARK_STYLE}
        region={{
          latitude,
          longitude,
          latitudeDelta: LAT_DELTA,
          longitudeDelta,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsUserLocation={false}
        showsCompass={false}
        showsScale={false}
        pointerEvents="none"
      >
        <Marker
          coordinate={{ latitude, longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <FlagMapMarker flag={country.flag} iso2={country.cca2} />
        </Marker>
      </MapView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: MAP_HEIGHT,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
  },
  wrapPressed: {
    opacity: 0.92,
  },
  map: {
    width: "100%",
    height: MAP_HEIGHT,
  },
  markerAnchor: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRingOuter: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: AI_EXPLORER_THEME.accentMuted,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
  },
  glowRingInner: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: AI_EXPLORER_THEME.accent,
    backgroundColor: AI_EXPLORER_THEME.accentSoft,
  },
  flagCircle: {
    width: FLAG_SIZE,
    height: FLAG_SIZE,
    borderRadius: FLAG_SIZE / 2,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.95)",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AI_EXPLORER_THEME.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 6,
  },
  flagImage: {
    width: FLAG_SIZE,
    height: FLAG_SIZE,
  },
  flagFallback: {
    fontSize: 16,
    lineHeight: FLAG_SIZE,
    textAlign: "center",
  },
});
