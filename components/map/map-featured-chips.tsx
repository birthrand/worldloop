import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { FeaturedShortcut } from "@/store/use-map-ui-store";
import { useMapUiStore } from "@/store/use-map-ui-store";

type FeaturedChipsProps = {
  onTrendingPress: () => void;
  onForYouPress: () => void;
  onNewActivityPress: () => void;
};

type ChipConfig = {
  id: Exclude<FeaturedShortcut, null>;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CHIPS: ChipConfig[] = [
  { id: "trending", label: "Trending Now", icon: "flame" },
  { id: "forYou", label: "For You World", icon: "globe-outline" },
  { id: "newActivity", label: "New Activity", icon: "sparkles" },
];

export function MapFeaturedChips({
  onTrendingPress,
  onForYouPress,
  onNewActivityPress,
}: FeaturedChipsProps) {
  const featuredShortcut = useMapUiStore((s) => s.featuredShortcut);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map((chip, index) => {
        const selected = featuredShortcut === chip.id;
        return (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={chip.label}
            onPress={
              chip.id === "trending"
                ? onTrendingPress
                : chip.id === "forYou"
                  ? onForYouPress
                  : onNewActivityPress
            }
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
              numberOfLines={1}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Near You (coming soon)"
        disabled
        style={({ pressed }) => [
          styles.chip,
          styles.chipSpacing,
          styles.nearYouChip,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="location-outline" size={16} color="#94a3b8" />
        <Text style={styles.chipLabel}>Near You</Text>
      </Pressable>

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
    maxWidth: 220,
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
  nearYouChip: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
  trailingPad: {
    width: 8,
  },
});

