import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { getActivityVisual } from "@/constants/map-activity";
import type { MapCluster } from "@/lib/map-clusters";

type MapPulseClusterMarkerProps = {
  cluster: MapCluster;
  selected: boolean;
  onPress: (cluster: MapCluster) => void;
};

export function MapPulseClusterMarker({
  cluster,
  selected,
  onPress,
}: MapPulseClusterMarkerProps) {
  const [latitude, longitude] = cluster.center;
  const visual = getActivityVisual(cluster.activity);

  const pulse = useSharedValue(1);

  // "Alive" feel: a gentle breathing loop on bubble markers.
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = selected ? 1.12 : pulse.value;
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges
      onPress={(event) => {
        event.stopPropagation?.();
        onPress(cluster);
      }}
    >
      <Animated.View
        style={[
          styles.bubble,
          {
            borderColor: visual.borderColor,
            backgroundColor: visual.bgColor,
          },
          selected && styles.bubbleSelected,
          animatedStyle,
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
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
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

