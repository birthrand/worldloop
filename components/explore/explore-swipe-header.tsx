import { Entypo, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ExploreCountryMoreMenus,
  getExploreHasCustomSort,
} from "@/components/explore/explore-country-more-menus";
import { ExploreFeedMenuSheet } from "@/components/explore/explore-feed-menu-sheet";
import type { HeroMediaMode } from "@/components/explore/explore-swipe-card";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_CARD_ACTION_GAP,
  EXPLORE_SWIPE_DECK_VERTICAL_GAP,
  EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
  EXPLORE_SWIPE_HEADER_ICON_COLOR,
  EXPLORE_SWIPE_HEADER_ICON_COLOR_ACTIVE,
  EXPLORE_SWIPE_HEADER_ICON_SIZE,
  EXPLORE_SWIPE_HEADER_TITLE_COLOR,
  EXPLORE_SWIPE_HEADER_TITLE_SIZE,
} from "@/constants/explore-swipe-layout";
import { continentDisplayLabel } from "@/constants/regions";
import {
  isSavedCountriesFeed,
  isSavedLandmarksFeed,
  usesLandmarkQueue,
} from "@/lib/explore-discovery-mode";
import { hasCultureVideo } from "@/lib/format-country";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";

type ExploreSwipeHeaderProps = {
  title?: string;
  heroMediaMode?: HeroMediaMode;
  onHeroMediaModeChange?: (mode: HeroMediaMode) => void;
};

type HeaderIconSet = "ionicons" | "entypo";

function HeaderIconButton({
  icon,
  iconSet = "ionicons",
  accessibilityLabel,
  accessibilityHint,
  onPress,
  active = false,
  disabled = false,
  activeColor,
}: {
  icon: keyof typeof Ionicons.glyphMap | keyof typeof Entypo.glyphMap;
  iconSet?: HeaderIconSet;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  activeColor?: string;
}) {
  const resolvedActiveColor =
    activeColor ?? EXPLORE_SWIPE_HEADER_ICON_COLOR_ACTIVE;
  const iconColor = disabled
    ? "rgba(255, 255, 255, 0.35)"
    : active
      ? resolvedActiveColor
      : EXPLORE_SWIPE_HEADER_ICON_COLOR;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        disabled && styles.iconButtonDisabled,
        pressed && !disabled && styles.iconButtonPressed,
      ]}
    >
      {iconSet === "entypo" ? (
        <Entypo
          name={icon as keyof typeof Entypo.glyphMap}
          size={EXPLORE_SWIPE_HEADER_ICON_SIZE}
          color={iconColor}
        />
      ) : (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={EXPLORE_SWIPE_HEADER_ICON_SIZE}
          color={iconColor}
        />
      )}
    </Pressable>
  );
}

export function ExploreSwipeHeader({
  title = "WorldLoop",
  heroMediaMode = "image",
  onHeroMediaModeChange,
}: ExploreSwipeHeaderProps) {
  const insets = useSafeAreaInsets();
  const openSearch = useSearchUiStore((s) => s.openSearch);
  const isSearchOpen = useSearchUiStore((s) => s.isOpen && s.context !== "map");
  const countries = useCountryFeedStore((s) => s.countries);
  const places = useCountryFeedStore((s) => s.places);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const sortField = useCountryFeedStore((s) => s.sortField);
  const sortOrder = useCountryFeedStore((s) => s.sortOrder);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const currentCountry = usesLandmarkQueue(discoveryMode)
    ? places[currentIndex]?.country
    : countries[currentIndex];
  const hasCustomSort = getExploreHasCustomSort(sortField, sortOrder);
  const isLandmarkMode = usesLandmarkQueue(discoveryMode);
  const canShowCulture =
    !isLandmarkMode &&
    currentCountry != null &&
    hasCultureVideo(currentCountry);

  const cultureAccessibilityLabel = currentCountry
    ? heroMediaMode === "video"
      ? `Show photos for ${currentCountry.name}`
      : canShowCulture
        ? `Watch culture video for ${currentCountry.name}`
        : `No culture video for ${currentCountry.name}`
    : "Culture video";

  const handleToggleCulture = () => {
    if (!canShowCulture) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onHeroMediaModeChange?.(heroMediaMode === "video" ? "image" : "video");
  };

  const rightButtonCount = isLandmarkMode ? 2 : 3;
  const headerRightSlotWidth =
    EXPLORE_SWIPE_HEADER_BUTTON_SIZE * rightButtonCount +
    EXPLORE_SWIPE_CARD_ACTION_GAP * (rightButtonCount - 1);

  const [isFeedMenuOpen, setIsFeedMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const feedMenuActive =
    isFeedMenuOpen ||
    discoveryMode === "saved" ||
    discoveryMode === "savedLandmarks" ||
    discoveryMode === "region" ||
    discoveryMode === "places";

  useEffect(() => {
    setIsFeedMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [currentIndex]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <View style={styles.leftSlot}>
          <HeaderIconButton
            icon="reorder-three-outline"
            accessibilityLabel="Browse feed filters"
            onPress={() => setIsFeedMenuOpen(true)}
            active={feedMenuActive}
          />
        </View>

        <View style={[styles.rightActions, { width: headerRightSlotWidth }]}>
          {!isLandmarkMode ? (
            <HeaderIconButton
              iconSet="entypo"
              icon={heroMediaMode === "video" ? "video" : "image-inverted"}
              accessibilityLabel={cultureAccessibilityLabel}
              accessibilityHint={
                canShowCulture
                  ? "Toggles between photos and a culture video on this card"
                  : "This country does not have a culture video yet"
              }
              onPress={handleToggleCulture}
              active={canShowCulture}
              activeColor={EXPLORE_SWIPE_ACCENT_COLOR}
              disabled={!canShowCulture}
            />
          ) : null}
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

      {isSavedCountriesFeed(discoveryMode) ? (
        <Text style={styles.modeSubtitle}>Saved · Countries</Text>
      ) : isSavedLandmarksFeed(discoveryMode) ? (
        <Text style={styles.modeSubtitle}>Saved · Landmarks</Text>
      ) : discoveryMode === "places" ? (
        <Text style={styles.modeSubtitle}>
          {selectedRegion
            ? `Landmarks · ${continentDisplayLabel(selectedRegion)} · ${places.length} landmark${places.length === 1 ? "" : "s"}`
            : `Landmarks · ${places.length} landmark${places.length === 1 ? "" : "s"}`}
        </Text>
      ) : null}

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

const HEADER_LEFT_SLOT_WIDTH = EXPLORE_SWIPE_HEADER_BUTTON_SIZE;

const styles = StyleSheet.create({
  root: {
    zIndex: 20,
    paddingBottom: EXPLORE_SWIPE_DECK_VERTICAL_GAP,
  },
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
  },
  leftSlot: {
    zIndex: 2,
    width: HEADER_LEFT_SLOT_WIDTH,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  iconButton: {
    width: EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
    height: EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDisabled: {
    opacity: 0.72,
  },
  iconButtonPressed: {
    opacity: 0.82,
  },
  rightActions: {
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: EXPLORE_SWIPE_CARD_ACTION_GAP,
  },
  title: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    textAlign: "center",
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_HEADER_TITLE_SIZE,
    lineHeight: EXPLORE_SWIPE_HEADER_BUTTON_SIZE,
    letterSpacing: 0.2,
    color: EXPLORE_SWIPE_HEADER_TITLE_COLOR,
    includeFontPadding: false,
  },
  modeSubtitle: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.82)",
  },
});
