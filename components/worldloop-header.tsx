import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const WORLDLOOP_HEADER_HORIZONTAL_PADDING = 16;
export const WORLDLOOP_HEADER_ROW_HEIGHT = 40;
export const WORLDLOOP_HEADER_SIDE_SLOT_WIDTH = 40;
export const WORLDLOOP_HEADER_ICON_SIZE = 22;
export const WORLDLOOP_HEADER_SEARCH_ICON_SIZE = 20;
export const WORLDLOOP_HEADER_ACCENT_COLOR = "#fbbf24";
export const WORLDLOOP_HEADER_MUTED_COLOR = "rgba(255, 255, 255, 0.75)";
export const WORLDLOOP_HEADER_TOP_PADDING = 2;
export const WORLDLOOP_HEADER_BOTTOM_PADDING = 0;

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
  inactiveColor?: string;
  brandFontFamily?: string;
  /** Row height — use 48+ on immersive overlays for 44pt touch targets. */
  rowHeight?: number;
  sideSlotWidth?: number;
  brandFontSize?: number;
  iconSize?: number;
  searchIconSize?: number;
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
  inactiveColor = WORLDLOOP_HEADER_MUTED_COLOR,
  brandFontFamily = "Poppins-Medium",
  rowHeight = WORLDLOOP_HEADER_ROW_HEIGHT,
  sideSlotWidth = WORLDLOOP_HEADER_SIDE_SLOT_WIDTH,
  brandFontSize = 16,
  iconSize = WORLDLOOP_HEADER_ICON_SIZE,
  searchIconSize = WORLDLOOP_HEADER_SEARCH_ICON_SIZE,
  menuAccessibilityLabel = "Browse feed filters",
  menuAccessibilityHint = "Opens For You, Here, and continent filters",
  searchAccessibilityLabel = "Search countries",
  searchAccessibilityHint = "Opens country search",
}: WorldLoopHeaderProps) {
  return (
    <View style={[styles.headerRow, { height: rowHeight }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={menuAccessibilityLabel}
        accessibilityHint={menuAccessibilityHint}
        hitSlop={8}
        onPress={onMenuPress}
        style={[styles.sideSlot, { width: sideSlotWidth, height: rowHeight }]}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.headerIconBox,
              { width: iconSize, height: iconSize },
            ]}
          >
            <Ionicons
              name="reorder-three-outline"
              size={iconSize}
              color={
                pressed || menuActive
                  ? WORLDLOOP_HEADER_ACCENT_COLOR
                  : inactiveColor
              }
            />
          </View>
        )}
      </Pressable>

      <Text
        style={[
          styles.brandTitle,
          {
            color: inactiveColor,
            fontFamily: brandFontFamily,
            fontSize: brandFontSize,
            lineHeight: rowHeight,
            left: WORLDLOOP_HEADER_HORIZONTAL_PADDING + sideSlotWidth,
            right: WORLDLOOP_HEADER_HORIZONTAL_PADDING + sideSlotWidth,
          },
        ]}
        pointerEvents="none"
      >
        WorldLoop
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={searchAccessibilityLabel}
        accessibilityHint={searchAccessibilityHint}
        hitSlop={8}
        onPress={onSearchPress}
        style={({ pressed }) => [
          styles.sideSlot,
          { width: sideSlotWidth, height: rowHeight },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.searchIconBox,
            { width: searchIconSize, height: searchIconSize },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={searchIconSize}
            color={searchActive ? WORLDLOOP_HEADER_ACCENT_COLOR : inactiveColor}
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
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
  },
  sideSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  searchIconBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    position: "absolute",
    fontFamily: "Poppins-Medium",
    letterSpacing: 0.2,
    textAlign: "center",
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.85,
  },
});
