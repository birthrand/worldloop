import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExploreFeedMenuSheet } from "@/components/explore/explore-feed-menu-sheet";
import { ExploreHeroHeaderBackdrop } from "@/components/explore/explore-hero-header-backdrop";
import { ExploreTopChromeScrim } from "@/components/explore/explore-top-chrome-scrim";
import {
  WORLDLOOP_HEADER_BOTTOM_PADDING,
  WORLDLOOP_HEADER_HORIZONTAL_PADDING,
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import {
  EXPLORE_HEADER_OVERLAY_BOTTOM_PADDING,
  getExploreHeaderChromeHeight,
} from "@/constants/explore-feed-layout";
import { continentDisplayLabel } from "@/constants/regions";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

const EXPLORE_HEADER_INACTIVE_COLOR = "#ffffff";

type ExploreTopBarProps = {
  overlay?: boolean;
  backdropImageUri?: string;
  backdropFlag?: string;
  backdropIso2?: string;
};

export function ExploreTopBar({
  overlay = false,
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

  const hereScopeLabel = focusedRegion
    ? continentDisplayLabel(focusedRegion)
    : "Map area";

  const chromeHeight = overlay
    ? getExploreHeaderChromeHeight(insets.top, {
        hereMode: discoveryMode === "here",
      })
    : 0;
  const hasHeroBackdrop = overlay && backdropFlag != null;

  return (
    <View
      style={overlay ? styles.overlayRoot : undefined}
      pointerEvents={overlay ? "box-none" : undefined}
    >
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
          inactiveColor={EXPLORE_HEADER_INACTIVE_COLOR}
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
      </View>
    </View>
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
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.82)",
  },
});
