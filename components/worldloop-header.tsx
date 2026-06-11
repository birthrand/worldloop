import { ProfileBackButton } from "@/components/profile/profile-back-button";
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
  onMenuPress?: () => void;
  menuActive?: boolean;
  onSearchPress?: () => void;
  searchActive?: boolean;
  /** Center title — defaults to WorldLoop. */
  title?: string;
  /** When false, left slot is empty (keeps title centered). */
  showMenu?: boolean;
  /** When false, right slot is empty (keeps title centered). */
  showSearch?: boolean;
  /** When true, left slot shows a back chevron instead of menu/empty. */
  showBack?: boolean;
  onBackPress?: () => void;
  backAccessibilityLabel?: string;
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
  showMore?: boolean;
  onMorePress?: () => void;
  moreActive?: boolean;
  moreAccessibilityLabel?: string;
  moreAccessibilityHint?: string;
  /** Override horizontal inset for icon row — defaults to 16. */
  horizontalPadding?: number;
};

export function WorldLoopHeader({
  onMenuPress,
  menuActive = false,
  onSearchPress,
  searchActive = false,
  title = "WorldLoop",
  showMenu = true,
  showSearch = true,
  showBack = false,
  onBackPress,
  backAccessibilityLabel = "Go back",
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
  showMore = false,
  onMorePress,
  moreActive = false,
  moreAccessibilityLabel = "More actions",
  moreAccessibilityHint = "Opens share, sort, and other country actions",
  horizontalPadding = WORLDLOOP_HEADER_HORIZONTAL_PADDING,
}: WorldLoopHeaderProps) {
  const actionIconSize = iconSize;
  const leftSlotWidth = sideSlotWidth;
  const hasDualRightActions = showMore && showSearch;
  const rightActionWidth = hasDualRightActions
    ? actionIconSize + 8
    : sideSlotWidth;
  const rightSlotWidth = hasDualRightActions
    ? rightActionWidth * 2
    : sideSlotWidth;
  const titleSideInsetLeft = horizontalPadding + leftSlotWidth;
  const titleSideInsetRight = horizontalPadding + rightSlotWidth;
  const centerTitleInRow = leftSlotWidth !== rightSlotWidth;

  return (
    <View
      style={[
        styles.headerRow,
        { height: rowHeight, paddingHorizontal: horizontalPadding },
      ]}
    >
      {showBack ? (
        <View
          style={[styles.sideSlot, { width: sideSlotWidth, height: rowHeight }]}
        >
          <ProfileBackButton
            onPress={onBackPress ?? (() => {})}
            accessibilityLabel={backAccessibilityLabel}
            size={36}
            iconSize={iconSize + 2}
            iconColor={inactiveColor}
          />
        </View>
      ) : showMenu ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={menuAccessibilityLabel}
          accessibilityHint={menuAccessibilityHint}
          hitSlop={8}
          onPress={onMenuPress}
          style={[styles.sideSlot, { width: leftSlotWidth, height: rowHeight }]}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.headerIconBox,
                { width: actionIconSize, height: actionIconSize },
              ]}
            >
              <Ionicons
                name="reorder-three-outline"
                size={actionIconSize}
                color={
                  pressed || menuActive
                    ? WORLDLOOP_HEADER_ACCENT_COLOR
                    : inactiveColor
                }
              />
            </View>
          )}
        </Pressable>
      ) : (
        <View
          style={[styles.sideSlot, { width: leftSlotWidth, height: rowHeight }]}
        />
      )}

      <Text
        style={[
          styles.brandTitle,
          {
            color: inactiveColor,
            fontFamily: brandFontFamily,
            fontSize: brandFontSize,
            lineHeight: rowHeight,
            left: centerTitleInRow ? 0 : titleSideInsetLeft,
            right: centerTitleInRow ? 0 : titleSideInsetRight,
          },
        ]}
        pointerEvents="none"
      >
        {title}
      </Text>

      {showSearch || showMore ? (
        <View
          style={[
            styles.rightActions,
            { width: rightSlotWidth, height: rowHeight },
          ]}
        >
          {showSearch ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={searchAccessibilityLabel}
              accessibilityHint={searchAccessibilityHint}
              hitSlop={8}
              onPress={onSearchPress}
              style={({ pressed }) => [
                styles.rightActionButton,
                { width: rightActionWidth },
                pressed && styles.pressed,
              ]}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.headerIconBox,
                    { width: actionIconSize, height: actionIconSize },
                  ]}
                >
                  <Ionicons
                    name="search-outline"
                    size={actionIconSize}
                    color={
                      searchActive || pressed
                        ? WORLDLOOP_HEADER_ACCENT_COLOR
                        : inactiveColor
                    }
                  />
                </View>
              )}
            </Pressable>
          ) : null}

          {showMore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={moreAccessibilityLabel}
              accessibilityHint={moreAccessibilityHint}
              hitSlop={8}
              onPress={onMorePress}
              style={({ pressed }) => [
                styles.rightActionButton,
                { width: rightActionWidth },
                pressed && styles.pressed,
              ]}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.headerIconBox,
                    { width: actionIconSize, height: actionIconSize },
                  ]}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={actionIconSize}
                    color={
                      pressed || moreActive
                        ? WORLDLOOP_HEADER_ACCENT_COLOR
                        : inactiveColor
                    }
                  />
                </View>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View
          style={[
            styles.sideSlot,
            { width: rightSlotWidth, height: rowHeight },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  rightActionButton: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBox: {
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
