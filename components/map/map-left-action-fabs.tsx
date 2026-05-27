import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { MapBoundaryControlsModal } from "@/components/map/map-boundary-controls-modal";

type MapLeftActionFabsProps = {
  onRandomPress: () => void;
  showBoundaryControls?: boolean;
};

export function MapLeftActionFabs({
  onRandomPress,
  showBoundaryControls = true,
}: MapLeftActionFabsProps) {
  const [isBoundaryModalOpen, setIsBoundaryModalOpen] = useState(false);

  return (
    <>
      <View style={styles.wrap} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pick a random country"
          onPress={onRandomPress}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <Ionicons name="dice-outline" size={20} color="#0b132b" />
        </Pressable>

        {showBoundaryControls ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Boundary style controls"
            onPress={() => setIsBoundaryModalOpen(true)}
            style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          >
            <Ionicons name="color-palette-outline" size={20} color="#0b132b" />
          </Pressable>
        ) : null}
      </View>

      <MapBoundaryControlsModal
        visible={isBoundaryModalOpen}
        onClose={() => setIsBoundaryModalOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    bottom: 98,
    alignItems: "center",
    gap: 8,
    zIndex: 6,
  },
  fab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fbbf24",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});
