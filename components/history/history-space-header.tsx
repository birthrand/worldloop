import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SavedBackButton } from "@/components/saved/saved-back-button";
import type { SavedCountriesLayout } from "@/components/saved/saved-countries-list";

type HistorySpaceHeaderProps = {
  onReturn?: () => void;
  layout?: SavedCountriesLayout;
  onLayoutChange?: (layout: SavedCountriesLayout) => void;
};

type HistoryLayoutToggleProps = {
  layout: SavedCountriesLayout;
  onLayoutChange: (layout: SavedCountriesLayout) => void;
};

function HistoryLayoutToggle({
  layout,
  onLayoutChange,
}: HistoryLayoutToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: layout === "grid" }}
        accessibilityLabel="Grid view"
        hitSlop={4}
        onPress={() => onLayoutChange("grid")}
        style={({ pressed }) => [
          styles.toggleButton,
          layout === "grid" && styles.toggleButtonActive,
          pressed && styles.toggleButtonPressed,
        ]}
      >
        <Ionicons
          name={layout === "grid" ? "grid" : "grid-outline"}
          size={18}
          color={layout === "grid" ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)"}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: layout === "list" }}
        accessibilityLabel="List view"
        hitSlop={4}
        onPress={() => onLayoutChange("list")}
        style={({ pressed }) => [
          styles.toggleButton,
          layout === "list" && styles.toggleButtonActive,
          pressed && styles.toggleButtonPressed,
        ]}
      >
        <Ionicons
          name={layout === "list" ? "list" : "list-outline"}
          size={18}
          color={layout === "list" ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)"}
        />
      </Pressable>
    </View>
  );
}

export function HistorySpaceHeader({
  onReturn,
  layout = "grid",
  onLayoutChange,
}: HistorySpaceHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.sideSlot}>
        {onReturn ? (
          <SavedBackButton
            accessibilityLabel="Back to profile"
            onPress={onReturn}
          />
        ) : null}
      </View>

      <Text className="font-semibold text-[18px] text-white">
        Recently viewed
      </Text>

      <View style={[styles.sideSlot, styles.sideSlotEnd]}>
        {onLayoutChange ? (
          <HistoryLayoutToggle
            layout={layout}
            onLayoutChange={onLayoutChange}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  sideSlot: {
    width: 40,
    minWidth: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sideSlotEnd: {
    width: 76,
    minWidth: 76,
    alignItems: "flex-end",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  toggleButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  toggleButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  toggleButtonPressed: {
    opacity: 0.85,
  },
});
