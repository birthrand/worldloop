import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

type RandomCountryFabProps = {
  onPress: () => void;
};

export function RandomCountryFab({ onPress }: RandomCountryFabProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pick a random country"
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Ionicons name="dice-outline" size={20} color="#0b132b" />
      </Pressable>
      {/* <Text style={styles.label}>Random Country</Text> */}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    bottom: 158,
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
  label: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});
