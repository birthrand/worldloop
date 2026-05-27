import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type MapOnboardingSheetProps = {
  onDismiss: () => void;
};

export function MapOnboardingSheet({ onDismiss }: MapOnboardingSheetProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to downward dragging for a subtle "swipe away" affordance.
          return gestureState.dy > 6;
        },
        onPanResponderMove: (_, gestureState) => {
          const next = Math.max(0, gestureState.dy);
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldDismiss = gestureState.dy > 90;
          if (!shouldDismiss) {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 7,
            }).start();
            return;
          }

          Animated.timing(translateY, {
            toValue: 220,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onDismiss());
        },
      }),
    [onDismiss, translateY],
  );

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 220,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [onDismiss, translateY]);

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          transform: [{ translateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.topRow}>
        <View style={styles.handleBar} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss map onboarding"
          onPress={dismiss}
          hitSlop={8}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={18} color="#ffffff" />
        </Pressable>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        Explore the World
      </Text>
      <Text style={styles.subtitle}>
        Tap a country to see content from that region.
      </Text>

      <View style={styles.hintsRow}>
        <Hint icon="resize-outline" label="Pinch to zoom" />
        <Hint icon="hand-left-outline" label="Drag to explore" />
        <Hint icon="layers-outline" label="Tap clusters" />
      </View>
    </Animated.View>
  );
}

function Hint({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.hint}>
      <Ionicons name={icon} size={16} color="#fbbf24" />
      <Text style={styles.hintLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "rgba(18, 24, 38, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  handleBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    color: "#ffffff",
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.78)",
  },
  hintsRow: {
    flexDirection: "row",
    gap: 10,
  },
  hint: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  hintLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
});

