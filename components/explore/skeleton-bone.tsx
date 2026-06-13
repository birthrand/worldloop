import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { EXPLORE_SWIPE_ICON_RING_BORDER } from "@/constants/explore-swipe-layout";

/** Hero sits on black — lower base opacity reads clearly. */
export const SKELETON_COLOR_HERO = "rgba(255, 255, 255, 0.12)";
/** Info strip sits on charcoal — needs a brighter bone to pulse visibly. */
export const SKELETON_COLOR_INFO = "rgba(255, 255, 255, 0.24)";

type SkeletonBoneProps = {
  pulse: Animated.Value;
  width?: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  tone?: "hero" | "info" | "ring";
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBone({
  pulse,
  width,
  height,
  borderRadius = 6,
  tone = "info",
  style,
}: SkeletonBoneProps) {
  const boneStyle =
    tone === "ring"
      ? styles.boneRing
      : tone === "hero"
        ? styles.boneHero
        : styles.boneInfo;

  return (
    <Animated.View
      style={[
        boneStyle,
        {
          ...(width != null ? { width } : null),
          height,
          borderRadius,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

export function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return pulse;
}

const styles = StyleSheet.create({
  boneHero: {
    backgroundColor: SKELETON_COLOR_HERO,
  },
  boneInfo: {
    backgroundColor: SKELETON_COLOR_INFO,
  },
  boneRing: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_ICON_RING_BORDER,
  },
});
