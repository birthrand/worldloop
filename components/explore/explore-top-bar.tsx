import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExploreFeedMenuSheet } from "@/components/explore/explore-feed-menu-sheet";
import {
  WORLDLOOP_HEADER_BOTTOM_PADDING,
  WORLDLOOP_HEADER_HORIZONTAL_PADDING,
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import { continentDisplayLabel } from "@/constants/regions";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

/** Extra breathing room between the header and the hero image. */
const EXPLORE_HEADER_CONTENT_GAP = 10;

export function ExploreTopBar() {
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

  return (
    <View
      style={{
        paddingTop: insets.top + WORLDLOOP_HEADER_TOP_PADDING,
        paddingBottom:
          WORLDLOOP_HEADER_BOTTOM_PADDING + EXPLORE_HEADER_CONTENT_GAP,
      }}
    >
      <WorldLoopHeader
        onMenuPress={() => setIsFeedMenuOpen(true)}
        menuActive={isFeedMenuOpen}
        onSearchPress={() => openSearch()}
        searchActive={isSearchOpen}
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
  );
}

const styles = StyleSheet.create({
  hereSubtitle: {
    marginTop: 2,
    paddingHorizontal: WORLDLOOP_HEADER_HORIZONTAL_PADDING,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.55)",
  },
});
