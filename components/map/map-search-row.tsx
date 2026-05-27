import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSearchUiStore } from "@/store/use-search-ui-store";

export function MapSearchRow() {
  const openSearch = useSearchUiStore((s) => s.openSearch);

  return (
    <View className="flex-row items-center gap-2 px-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search countries"
        onPress={openSearch}
        className="h-12 min-w-0 flex-1 flex-row items-center gap-3 rounded-2xl bg-white/15 px-4"
      >
        <Ionicons name="search" size={20} color="#94a3b8" />
        <Text className="min-w-0 flex-1 body-md text-white/40">
          Search countries, regions, cultures…
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Map filters"
        onPress={() => {
          Alert.alert(
            "Filters",
            "Advanced map filters are coming in a later lesson.",
          );
        }}
        style={({ pressed }) => [
          styles.filterButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="options-outline" size={22} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  pressed: {
    opacity: 0.85,
  },
});
