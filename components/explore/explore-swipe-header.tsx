import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ExploreCountryMoreMenus,
  getExploreHasCustomSort,
} from "@/components/explore/explore-country-more-menus";
import { ExploreFeedMenuSheet } from "@/components/explore/explore-feed-menu-sheet";
import {
  EXPLORE_SWIPE_CARD_ACTION_GAP,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_DECK_VERTICAL_GAP,
  EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
  EXPLORE_SWIPE_HEADER_ICON_COLOR,
  EXPLORE_SWIPE_HEADER_ICON_COLOR_ACTIVE,
  EXPLORE_SWIPE_HEADER_ICON_SIZE,
  EXPLORE_SWIPE_HEADER_TITLE_COLOR,
  EXPLORE_SWIPE_HEADER_TITLE_SIZE,
} from "@/constants/explore-swipe-layout";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";

type ExploreSwipeHeaderProps = {
  title?: string;
};

function HeaderIconButton({
  icon,
  accessibilityLabel,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        active && styles.iconButtonActive,
        pressed && styles.iconButtonPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={EXPLORE_SWIPE_HEADER_ICON_SIZE}
        color={
          active
            ? EXPLORE_SWIPE_HEADER_ICON_COLOR_ACTIVE
            : EXPLORE_SWIPE_HEADER_ICON_COLOR
        }
      />
    </Pressable>
  );
}

export function ExploreSwipeHeader({
  title = "WorldLoop",
}: ExploreSwipeHeaderProps) {
  const insets = useSafeAreaInsets();
  const openSearch = useSearchUiStore((s) => s.openSearch);
  const isSearchOpen = useSearchUiStore((s) => s.isOpen && s.context !== "map");
  const countries = useCountryFeedStore((s) => s.countries);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const sortField = useCountryFeedStore((s) => s.sortField);
  const sortOrder = useCountryFeedStore((s) => s.sortOrder);
  const currentCountry = countries[currentIndex];
  const hasCustomSort = getExploreHasCustomSort(sortField, sortOrder);

  const [isFeedMenuOpen, setIsFeedMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    setIsFeedMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [currentIndex]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <HeaderIconButton
          icon="reorder-three-outline"
          accessibilityLabel="Browse feed filters"
          onPress={() => setIsFeedMenuOpen(true)}
          active={isFeedMenuOpen}
        />

        <View style={styles.rightActions}>
          <HeaderIconButton
            icon="search-outline"
            accessibilityLabel="Search countries"
            onPress={() => openSearch()}
            active={isSearchOpen}
          />
          <HeaderIconButton
            icon="ellipsis-vertical"
            accessibilityLabel="More actions"
            onPress={() => setIsMoreMenuOpen(true)}
            active={hasCustomSort || isMoreMenuOpen}
          />
        </View>

        <Text style={styles.title} pointerEvents="none" numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ExploreFeedMenuSheet
        visible={isFeedMenuOpen}
        onClose={() => setIsFeedMenuOpen(false)}
      />

      <ExploreCountryMoreMenus
        country={currentCountry}
        isMoreMenuOpen={isMoreMenuOpen}
        onCloseMoreMenu={() => setIsMoreMenuOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
    paddingBottom: EXPLORE_SWIPE_DECK_VERTICAL_GAP,
  },
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
  },
  iconButton: {
    zIndex: 1,
    width: EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
    height: EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {},
  iconButtonPressed: {
    opacity: 0.82,
  },
  rightActions: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: EXPLORE_SWIPE_CARD_ACTION_GAP,
  },
  title: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_HEADER_TITLE_SIZE,
    lineHeight: EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
    letterSpacing: 0.2,
    color: EXPLORE_SWIPE_HEADER_TITLE_COLOR,
    includeFontPadding: false,
  },
});
