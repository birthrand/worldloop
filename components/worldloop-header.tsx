import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const WORLDLOOP_HEADER_HORIZONTAL_PADDING = 16;
export const WORLDLOOP_HEADER_ROW_HEIGHT = 44;
export const WORLDLOOP_HEADER_SIDE_SLOT_WIDTH = 44;
export const WORLDLOOP_HEADER_ICON_SIZE = 24;
export const WORLDLOOP_HEADER_SEARCH_ICON_SIZE = 22;
export const WORLDLOOP_HEADER_ACCENT_COLOR = "#fbbf24";
export const WORLDLOOP_HEADER_TOP_PADDING = 4;
export const WORLDLOOP_HEADER_BOTTOM_PADDING = 2;

export function getWorldLoopHeaderHeight(safeAreaTop: number) {
  return (
    safeAreaTop +
    WORLDLOOP_HEADER_TOP_PADDING +
    WORLDLOOP_HEADER_ROW_HEIGHT +
    WORLDLOOP_HEADER_BOTTOM_PADDING
  );
}

type WorldLoopHeaderProps = {
  onMenuPress: () => void;
  menuActive?: boolean;
  onSearchPress: () => void;
  searchActive?: boolean;
  menuAccessibilityLabel?: string;
  menuAccessibilityHint?: string;
  searchAccessibilityLabel?: string;
  searchAccessibilityHint?: string;
};

export function WorldLoopHeader({
  onMenuPress,
  menuActive = false,
  onSearchPress,
  searchActive = false,
  menuAccessibilityLabel = "Browse feed filters",
  menuAccessibilityHint = "Opens For You, Here, and continent filters",
  searchAccessibilityLabel = "Search countries",
  searchAccessibilityHint = "Opens country search",
}: WorldLoopHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={menuAccessibilityLabel}
        accessibilityHint={menuAccessibilityHint}
        hitSlop={8}
        onPress={onMenuPress}
        style={styles.sideSlot}
      >
        {({ pressed }) => (
          <View style={styles.headerIconBox}>
            <Ionicons
              name="reorder-three-outline"
              size={WORLDLOOP_HEADER_ICON_SIZE}
              color={
                pressed || menuActive
                  ? WORLDLOOP_HEADER_ACCENT_COLOR
                  : "#ffffff"
              }
            />
          </View>
        )}
      </Pressable>

      <Text style={styles.brandTitle} pointerEvents="none">
        WorldLoop
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={searchAccessibilityLabel}
        accessibilityHint={searchAccessibilityHint}
        hitSlop={8}
        onPress={onSearchPress}
        style={({ pressed }) => [styles.sideSlot, pressed && styles.pressed]}
      >
        <View style={styles.searchIconBox}>
          <Ionicons
            name="search-outline"
            size={WORLDLOOP_HEADER_SEARCH_ICON_SIZE}
            color={searchActive ? WORLDLOOP_HEADER_ACCENT_COLOR : "#ffffff"}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: WORLDLOOP_HEADER_ROW_HEIGHT,
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
  },
  sideSlot: {
    width: WORLDLOOP_HEADER_SIDE_SLOT_WIDTH,
    height: WORLDLOOP_HEADER_ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBox: {
    width: WORLDLOOP_HEADER_ICON_SIZE,
    height: WORLDLOOP_HEADER_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  searchIconBox: {
    width: WORLDLOOP_HEADER_SEARCH_ICON_SIZE,
    height: WORLDLOOP_HEADER_SEARCH_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    position: "absolute",
    left:
      WORLDLOOP_HEADER_HORIZONTAL_PADDING + WORLDLOOP_HEADER_SIDE_SLOT_WIDTH,
    right:
      WORLDLOOP_HEADER_HORIZONTAL_PADDING + WORLDLOOP_HEADER_SIDE_SLOT_WIDTH,
    fontFamily: "Poppins-Medium",
    fontSize: 17,
    lineHeight: WORLDLOOP_HEADER_ROW_HEIGHT,
    color: "#ffffff",
    letterSpacing: 0.2,
    textAlign: "center",
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.85,
  },
});
