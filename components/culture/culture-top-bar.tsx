import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CultureFeedMenuSheet } from "@/components/culture/culture-feed-menu-sheet";
import {
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import {
  CULTURE_CHROME_ICON_SIZE,
  CULTURE_CHROME_TITLE_SIZE,
  CULTURE_CHROME_TOUCH_SIZE,
} from "@/constants/culture-chrome";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";

export function CultureTopBar() {
  const insets = useSafeAreaInsets();
  const [isFeedMenuOpen, setIsFeedMenuOpen] = useState(false);
  const openSearch = useSearchUiStore((s) => s.openSearch);
  const isSearchOpen = useSearchUiStore(
    (s) => s.isOpen && s.context === "culture",
  );
  const isSortSheetOpen = useCultureFeedStore((s) => s.isSortSheetOpen);

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <View
        style={{
          paddingTop: insets.top + WORLDLOOP_HEADER_TOP_PADDING,
        }}
      >
        <WorldLoopHeader
          onMenuPress={() => setIsFeedMenuOpen(true)}
          menuActive={isFeedMenuOpen || isSortSheetOpen}
          menuAccessibilityLabel="Browse culture feed"
          menuAccessibilityHint="Opens For You and continent filters"
          onSearchPress={() => openSearch("culture")}
          searchActive={isSearchOpen}
          inactiveColor="#ffffff"
          brandFontFamily="Poppins-Bold"
          rowHeight={CULTURE_CHROME_TOUCH_SIZE}
          sideSlotWidth={CULTURE_CHROME_TOUCH_SIZE}
          brandFontSize={CULTURE_CHROME_TITLE_SIZE}
          iconSize={CULTURE_CHROME_ICON_SIZE}
          searchIconSize={CULTURE_CHROME_ICON_SIZE}
        />
      </View>

      <CultureFeedMenuSheet
        visible={isFeedMenuOpen}
        onClose={() => setIsFeedMenuOpen(false)}
      />
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
});
