import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type MapControlsProps = {
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function MapControls({
  onReset,
  onZoomIn,
  onZoomOut,
}: MapControlsProps) {
  const [showNavZoomControls, setShowNavZoomControls] = useState(true);

  return (
    <View
      style={styles.column}
      pointerEvents="box-none"
      className="items-center"
    >
      {showNavZoomControls ? (
        <View style={styles.stack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset to world view"
            onPress={onReset}
            style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          >
            <Ionicons name="navigate-outline" size={20} color="#ffffff" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            onPress={onZoomIn}
            style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            onPress={onZoomOut}
            style={({ pressed }) => [styles.control, pressed && styles.pressed]}
          >
            <Ionicons name="remove" size={20} color="#ffffff" />
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Map legend"
        onPress={() => {
          setShowNavZoomControls((prev) => !prev);
        }}
        style={({ pressed }) => [
          styles.legendButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="layers-outline" size={18} color="#ffffff" />
        {/* <Text style={styles.legendText}>Legend</Text> */}
        {/* <Ionicons name="chevron-up" size={14} color="#94a3b8" /> */}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    position: "absolute",
    left: 16,
    bottom: 200,
    gap: 4,
    zIndex: 5,
  },
  stack: {
    borderRadius: 32,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  control: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  legendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  legendText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.95,
    // golden color #FBBF24
    backgroundColor: "#29303C",
  },
});
