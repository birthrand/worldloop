import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSearchUiStore } from "@/store/use-search-ui-store";

export function MapSearchRow() {
  const openSearch = useSearchUiStore((s) => s.openSearch);

  return (
    <View className="px-4">
      <View className="h-12 flex-row items-center gap-2 rounded-2xl bg-white/15 pl-4 pr-1.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search countries"
          onPress={() => openSearch("map")}
          className="min-h-12 min-w-0 flex-1 flex-row items-center gap-3"
        >
          <Ionicons name="search" size={20} color="#FFFFFF66" />
          <Text
            className="min-w-0 flex-1 body-md text-white/40"
            numberOfLines={1}
          >
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
          <Ionicons name="options-outline" size={22} color="#FFFFFF66" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
