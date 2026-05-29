import { Pressable, StyleSheet, Text } from "react-native";

import { MapChipScrollRow } from "@/components/map/map-chip-scroll-row";
import {
  MAP_CHIP_BASE,
  MAP_CHIP_SELECTED,
  MAP_CHROME_ACCENT,
  MAP_CHROME_TEXT_MUTED,
} from "@/constants/map-chrome-styles";
import type { MapFilterChip } from "@/store/use-map-store";
import { useMapStore } from "@/store/use-map-store";

type ChipConfig = {
  id: MapFilterChip;
  label: string;
};

const CHIPS: ChipConfig[] = [
  { id: "all", label: "All" },
  { id: "population", label: "Population" },
  { id: "culture", label: "Culture" },
  { id: "nature", label: "Nature" },
  { id: "history", label: "History" },
];

export function MapFilterChips() {
  const activeChip = useMapStore((s) => s.activeChip);
  const setActiveChip = useMapStore((s) => s.setActiveChip);

  return (
    <MapChipScrollRow>
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
              selected ? styles.chipSelected : styles.chipDefault,
              pressed && styles.pressed,
            ]}
          >
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
    </MapChipScrollRow>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
  },
  chipDefault: MAP_CHIP_BASE,
  chipSelected: MAP_CHIP_SELECTED,
  chipSpacing: {
    marginLeft: 6,
  },
  chipLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: MAP_CHROME_TEXT_MUTED,
  },
  chipLabelSelected: {
    color: MAP_CHROME_ACCENT,
    fontFamily: "Poppins-Medium",
  },
  pressed: {
    opacity: 0.9,
  },
});
