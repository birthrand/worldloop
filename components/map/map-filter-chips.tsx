import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { MapFilterChip } from "@/store/use-map-store";
import { useMapStore } from "@/store/use-map-store";

type ChipConfig = {
  id: MapFilterChip;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CHIPS: ChipConfig[] = [
  { id: "all", label: "All", icon: "globe-outline" },
  { id: "population", label: "Population", icon: "people-outline" },
  { id: "culture", label: "Culture", icon: "color-palette-outline" },
  { id: "nature", label: "Nature", icon: "leaf-outline" },
  { id: "history", label: "History", icon: "library-outline" },
];

export function MapFilterChips() {
  const activeChip = useMapStore((s) => s.activeChip);
  const setActiveChip = useMapStore((s) => s.setActiveChip);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map((chip, index) => {
        const selected = activeChip === chip.id;
        return (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Filter by ${chip.label}`}
            onPress={() => setActiveChip(chip.id)}
            style={({ pressed }) => [
              styles.chip,
              index > 0 && styles.chipSpacing,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={chip.icon}
              size={16}
              color={selected ? "#fbbf24" : "#94a3b8"}
            />
            <Text
              style={[
                styles.chipLabel,
                selected ? styles.chipLabelSelected : undefined,
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
      <View style={styles.trailingPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  chipSpacing: {
    marginLeft: 8,
  },
  chipSelected: {
    borderColor: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.08)",
  },
  chipLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#94a3b8",
  },
  chipLabelSelected: {
    color: "#fbbf24",
    fontFamily: "Poppins-SemiBold",
  },
  pressed: {
    opacity: 0.88,
  },
  trailingPad: {
    width: 8,
  },
});
