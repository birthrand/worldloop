import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const RIPPLE_SIZE = 56;
const RIPPLE_DURATION_MS = 450;

type MapTapRippleProps = {
  x: number;
  y: number;
  /** Increment to replay the burst animation. */
  triggerKey: number;
};

export function MapTapRipple({ x, y, triggerKey }: MapTapRippleProps) {
  const scale = useSharedValue(0.45);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = 0.45;
    opacity.value = 0.5;
    scale.value = withTiming(1.85, {
      duration: RIPPLE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(0, {
      duration: RIPPLE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [opacity, scale, triggerKey]);

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ripple,
        {
          left: x - RIPPLE_SIZE / 2,
          top: y - RIPPLE_SIZE / 2,
        },
        rippleStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ripple: {
    position: "absolute",
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(251, 191, 36, 0.85)",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },
});
