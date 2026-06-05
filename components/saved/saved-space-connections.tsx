import { StyleSheet, View } from "react-native";

import type { PlanetCenter } from "@/lib/saved-space-layout";

type SavedSpaceConnectionsProps = {
  centers: PlanetCenter[];
  pairs: [number, number][];
};

export function SavedSpaceConnections({
  centers,
  pairs,
}: SavedSpaceConnectionsProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pairs.map(([fromIndex, toIndex]) => {
        const from = centers[fromIndex];
        const to = centers[toIndex];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View
            key={`${fromIndex}-${toIndex}`}
            style={[
              styles.line,
              {
                width: length,
                left: from.x,
                top: from.y,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: "absolute",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    transformOrigin: "left center",
  },
});
