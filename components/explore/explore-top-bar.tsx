import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ExploreCountryMoreMenus,
  getExploreHasCustomSort,
} from "@/components/explore/explore-country-more-menus";
import { ExploreFeedMenuSheet } from "@/components/explore/explore-feed-menu-sheet";
import { ExploreHeroHeaderBackdrop } from "@/components/explore/explore-hero-header-backdrop";
import { ExploreTopChromeScrim } from "@/components/explore/explore-top-chrome-scrim";
import {
  WORLDLOOP_HEADER_BOTTOM_PADDING,
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import {
  CULTURE_CHROME_ICON_SIZE,
  CULTURE_CHROME_TITLE_SIZE,
  CULTURE_CHROME_TOUCH_SIZE,
} from "@/constants/culture-chrome";
import {
  EXPLORE_HEADER_HORIZONTAL_PADDING,
  EXPLORE_HEADER_OVERLAY_BOTTOM_PADDING,
  getExploreHeaderChromeHeight,
} from "@/constants/explore-feed-layout";
import { continentDisplayLabel } from "@/constants/regions";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

const EXPLORE_HEADER_INACTIVE_COLOR = "#ffffff";
const HEADER_HIDE_OFFSET = -20;
const HEADER_HIDE_DURATION_MS = 220;

type ExploreTopBarProps = {
  overlay?: boolean;
  visible?: boolean;
  backdropImageUri?: string;
  backdropFlag?: string;
  backdropIso2?: string;
};

export function ExploreTopBar({
  overlay = false,
  visible = true,
  backdropImageUri,
  backdropFlag,
  backdropIso2,
}: ExploreTopBarProps) {
  const insets = useSafeAreaInsets();
  const openSearch = useSearchUiStore((s) => s.openSearch);
  const isSearchOpen = useSearchUiStore((s) => s.isOpen && s.context !== "map");
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const countryCount = useCountryFeedStore((s) => s.countries.length);
  const focusedRegion = useSpatialContextStore(
    (s) => s.discoveryScope.focusedRegion,
  );

  const [isFeedMenuOpen, setIsFeedMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const visibility = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    visibility.value = withTiming(visible ? 1 : 0, {
      duration: HEADER_HIDE_DURATION_MS,
    });
  }, [visible, visibility]);

  useEffect(() => {
    if (!visible && isFeedMenuOpen) {
      setIsFeedMenuOpen(false);
    }
    if (!visible && isMoreMenuOpen) {
      setIsMoreMenuOpen(false);
    }
  }, [isFeedMenuOpen, isMoreMenuOpen, visible]);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: visibility.value,
    transform: [
      {
        translateY: (1 - visibility.value) * HEADER_HIDE_OFFSET,
      },
    ],
  }));
  const countries = useCountryFeedStore((s) => s.countries);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const sortField = useCountryFeedStore((s) => s.sortField);
  const sortOrder = useCountryFeedStore((s) => s.sortOrder);
  const currentCountry = countries[currentIndex];
  const hasCustomSort = getExploreHasCustomSort(sortField, sortOrder);

  const hereScopeLabel = focusedRegion
    ? continentDisplayLabel(focusedRegion)
    : "Map area";

  const chromeHeight = overlay
    ? getExploreHeaderChromeHeight(insets.top, {
        hereMode: discoveryMode === "here",
      })
    : 0;
  const hasHeroBackdrop = overlay && backdropFlag != null;

  const root = (
    <>
      {hasHeroBackdrop ? (
        <ExploreHeroHeaderBackdrop
          height={chromeHeight}
          imageUri={backdropImageUri}
          flag={backdropFlag}
          iso2={backdropIso2}
        />
      ) : overlay ? (
        <ExploreTopChromeScrim height={chromeHeight} />
      ) : null}

      <View
        style={{
          paddingTop: insets.top + WORLDLOOP_HEADER_TOP_PADDING,
          paddingBottom: overlay
            ? EXPLORE_HEADER_OVERLAY_BOTTOM_PADDING
            : WORLDLOOP_HEADER_BOTTOM_PADDING,
        }}
      >
        <WorldLoopHeader
          onMenuPress={() => setIsFeedMenuOpen(true)}
          menuActive={isFeedMenuOpen}
          onSearchPress={() => openSearch()}
          searchActive={isSearchOpen}
          showMore
          onMorePress={() => setIsMoreMenuOpen(true)}
          moreActive={hasCustomSort || isMoreMenuOpen}
          inactiveColor={EXPLORE_HEADER_INACTIVE_COLOR}
          brandFontFamily="Poppins-Bold"
          rowHeight={CULTURE_CHROME_TOUCH_SIZE}
          sideSlotWidth={CULTURE_CHROME_TOUCH_SIZE}
          brandFontSize={CULTURE_CHROME_TITLE_SIZE}
          iconSize={CULTURE_CHROME_ICON_SIZE}
          horizontalPadding={EXPLORE_HEADER_HORIZONTAL_PADDING}
        />

        {discoveryMode === "here" ? (
          <Text style={styles.hereSubtitle}>
            Here · {hereScopeLabel} · {countryCount} countries
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
    </>
  );

  if (!overlay) {
    return <View pointerEvents="auto">{root}</View>;
  }

  return (
    <Animated.View
      style={[styles.overlayRoot, animatedOverlayStyle]}
      pointerEvents={visible ? "box-none" : "none"}
    >
      {root}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  hereSubtitle: {
    paddingHorizontal: EXPLORE_HEADER_HORIZONTAL_PADDING,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.82)",
  },
});
