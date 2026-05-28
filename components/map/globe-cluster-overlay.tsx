import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { getActivityVisual } from "@/constants/map-activity";
import type { GlobeScreenPosition } from "@/lib/globe-screen-project";
import type { MapCluster } from "@/lib/map-clusters";

type GlobeClusterOverlayProps = {
  clusters: MapCluster[];
  positions: GlobeScreenPosition[];
  focusedRegion: string | null;
  onClusterPress: (cluster: MapCluster) => void;
};

const BUBBLE_SIZE = 58;
const HALF = BUBBLE_SIZE / 2;

function PulsingClusterBubble({
  cluster,
  selected,
  onPress,
}: {
  cluster: MapCluster;
  selected: boolean;
  onPress: () => void;
}) {
  const visual = getActivityVisual(cluster.activity);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const bubbleStyle = useAnimatedStyle(() => {
    const scale = selected ? 1.12 : pulse.value;
    return { transform: [{ scale }] };
  });

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value * 1.18 }],
    opacity: selected ? 0.5 : 0.28 + (pulse.value - 1) * 2,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cluster.region}, ${cluster.countryCount} countries`}
      onPress={onPress}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: visual.ringColor },
          ringStyle,
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.bubble,
          {
            borderColor: visual.borderColor,
            backgroundColor: visual.bgColor,
          },
          selected && styles.bubbleSelected,
          bubbleStyle,
        ]}
        pointerEvents="none"
      >
        <View style={styles.inner}>
          <Ionicons
            name={visual.icon}
            size={14}
            color={selected ? "#fbbf24" : visual.textColor}
          />
          <Text style={[styles.count, selected && styles.countSelected]}>
            {cluster.countryCount}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function GlobeClusterOverlay({
  clusters,
  positions,
  focusedRegion,
  onClusterPress,
}: GlobeClusterOverlayProps) {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {positions.map((pos) => {
        if (!pos.visible) return null;

        const cluster = clusters.find((c) => c.id === pos.id);
        if (!cluster) return null;

        const selected = focusedRegion === cluster.region;

        return (
          <View
            key={cluster.id}
            style={[
              styles.anchor,
              {
                left: pos.x - HALF,
                top: pos.y - HALF,
              },
            ]}
            pointerEvents="box-none"
          >
            <PulsingClusterBubble
              cluster={cluster}
              selected={selected}
              onPress={() => onClusterPress(cluster)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  anchor: {
    position: "absolute",
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pressable: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: HALF,
    borderWidth: 2,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: HALF,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  bubbleSelected: {
    borderColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOpacity: 0.6,
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  count: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: "#ffffff",
  },
  countSelected: {
    color: "#fbbf24",
  },
});
