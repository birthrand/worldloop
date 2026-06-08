import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type FloatingPinProps = {
  left: `${number}%`;
  top: `${number}%`;
  delayMs: number;
};

function FloatingPin({ left, top, delayMs }: FloatingPinProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1.12, {
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, [delayMs, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.72,
  }));

  return (
    <Animated.View style={[styles.pin, animatedStyle, { left, top }]}>
      <Ionicons name="location" size={14} color="#FBBF24" />
    </Animated.View>
  );
}

export function OnboardingFloatingAccents() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <FloatingPin left="24%" top="78%" delayMs={200} />
      <FloatingPin left="66%" top="74%" delayMs={700} />
      <FloatingPin left="50%" top="86%" delayMs={1100} />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(11, 19, 43, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
});
