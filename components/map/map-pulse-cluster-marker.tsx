import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";

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

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges={false}
      onPress={(event) => {
        event.stopPropagation?.();
        onPress(cluster);
      }}
    >
      <View
        style={[
          styles.bubble,
          {
            borderColor: visual.borderColor,
            backgroundColor: visual.bgColor,
          },
          selected && styles.bubbleSelected,
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
      </View>
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

