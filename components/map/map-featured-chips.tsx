import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import { MapChipScrollRow } from "@/components/map/map-chip-scroll-row";
import {
  MAP_CHIP_BASE,
  MAP_CHIP_SELECTED,
  MAP_CHROME_ACCENT,
  MAP_CHROME_BORDER,
  MAP_CHROME_TEXT_MUTED,
} from "@/constants/map-chrome-styles";
import type { FeaturedShortcut } from "@/store/use-map-ui-store";
import { useMapUiStore } from "@/store/use-map-ui-store";

type FeaturedChipsProps = {
  onAllPress: () => void;
  onTerrainPress: () => void;
  onSavedPress: () => void;
};

type ChipConfig = {
  id: FeaturedShortcut;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconSelected: keyof typeof Ionicons.glyphMap;
};

const CHIPS: ChipConfig[] = [
  { id: "all", label: "All", icon: "layers-outline", iconSelected: "layers" },
  {
    id: "terrain",
    label: "Terrain",
    icon: "earth-outline",
    iconSelected: "earth",
  },
  {
    id: "saved",
    label: "Saved",
    icon: "location-outline",
    iconSelected: "location",
  },
];

export function MapFeaturedChips({
  onAllPress,
  onTerrainPress,
  onSavedPress,
}: FeaturedChipsProps) {
  const featuredShortcut = useMapUiStore((s) => s.featuredShortcut);

  const handlers: Record<FeaturedShortcut, () => void> = {
    all: onAllPress,
    terrain: onTerrainPress,
    saved: onSavedPress,
  };

  return (
    <MapChipScrollRow>
      {CHIPS.map((chip, index) => {
        const selected = featuredShortcut === chip.id;
        return (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={chip.label}
            onPress={handlers[chip.id]}
            style={({ pressed }) => [
              styles.chip,
              index > 0 && styles.chipSpacing,
              selected ? styles.chipSelected : styles.chipDefault,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={selected ? chip.iconSelected : chip.icon}
              size={15}
              color={selected ? MAP_CHROME_ACCENT : MAP_CHROME_TEXT_MUTED}
            />
            <Text
              style={[
                styles.chipLabel,
                selected ? styles.chipLabelSelected : undefined,
              ]}
              numberOfLines={1}
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
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
  },
  chipDefault: {
    ...MAP_CHIP_BASE,
    borderWidth: 1,
    borderColor: MAP_CHROME_BORDER,
  },
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
