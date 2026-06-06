import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { SavedPlanetSphere } from "@/components/saved/saved-planet-sphere";
import type {
  PlanetAnchor,
  PlanetLayoutSlot,
  PlanetPalette,
} from "@/lib/saved-space-layout";
import type { Country } from "@/types/country";

type SavedPlanetNodeProps = {
  country: Country;
  slot: PlanetLayoutSlot;
  palette: PlanetPalette;
  index: number;
  position: PlanetAnchor;
  onPress: () => void;
};
export function SavedPlanetNode({
  country,
  slot,
  palette,
  index,
  position,
  onPress,
}: SavedPlanetNodeProps) {
  const drift = useSharedValue(0);
  const entrance = useSharedValue(0);
  useEffect(() => {
    entrance.value = withDelay(
      index * 90,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    drift.value = withDelay(
      600 + index * 80,
      withRepeat(
        withTiming(1, {
          duration: 5200 + index * 400,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, [drift, entrance, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [-1.5, 1.5]) },
      { scale: interpolate(entrance.value, [0, 1], [0.82, 1]) },
    ],
  }));

  const planetSize = slot.size;

  return (
    <Animated.View
      style={[
        styles.root,
        {
          top: position.top,
          left: position.left,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${country.name}`}
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <SavedPlanetSphere
          size={planetSize}
          palette={palette}
          flag={country.flag}
          iso2={country.cca2}
        />

        <Text
          className="mt-3 max-w-[108px] text-center font-medium text-[11px] text-white"
          numberOfLines={2}
        >
          {country.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    alignItems: "center",
  },
  pressable: {
    alignItems: "center",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
});
