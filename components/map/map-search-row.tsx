import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  MAP_CHROME_BORDER,
  MAP_CHROME_PLACEHOLDER,
  MAP_CHROME_SURFACE,
} from "@/constants/map-chrome-styles";
import { useSearchUiStore } from "@/store/use-search-ui-store";

export function MapSearchRow() {
  const openSearch = useSearchUiStore((s) => s.openSearch);

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search countries"
          onPress={() => openSearch("map")}
          style={({ pressed }) => [
            styles.searchPressable,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="search" size={20} color={MAP_CHROME_PLACEHOLDER} />
          <Text
            className="min-w-0 flex-1 body-md"
            style={styles.placeholder}
            numberOfLines={1}
          >
            Search places, cities, countries…
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
          <Ionicons
            name="options-outline"
            size={20}
            color={MAP_CHROME_PLACEHOLDER}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
  },
  bar: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 21,
    backgroundColor: MAP_CHROME_SURFACE,
    borderWidth: 1,
    borderColor: MAP_CHROME_BORDER,
  },
  searchPressable: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 42,
  },
  placeholder: {
    fontFamily: "Poppins-Regular",
    color: MAP_CHROME_PLACEHOLDER,
  },
  filterButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.88,
  },
});
