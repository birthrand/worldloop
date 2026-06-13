import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  EXPLORE_SWIPE_TAB_ACTIVE_BG,
  EXPLORE_SWIPE_TAB_ACTIVE_TEXT,
  EXPLORE_SWIPE_TAB_HEIGHT,
  EXPLORE_SWIPE_TAB_INACTIVE_TEXT,
  EXPLORE_SWIPE_TAB_RADIUS,
  EXPLORE_SWIPE_TAB_TRACK_BG,
  EXPLORE_SWIPE_TAB_TRACK_BORDER,
  EXPLORE_SWIPE_TEXT_SEGMENT,
  EXPLORE_SWIPE_TEXT_SEGMENT_LETTER_SPACING,
} from "@/constants/explore-swipe-layout";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

type ExploreSwipeTabId = "forYou" | "here";

const TABS: { id: ExploreSwipeTabId; label: string }[] = [
  { id: "forYou", label: "FOR YOU" },
  { id: "here", label: "HERE" },
];

type ExploreSwipeTabsProps = {
  /** Static highlight for skeleton — no store wiring. */
  previewActive?: ExploreSwipeTabId;
};

export function ExploreSwipeTabs({ previewActive }: ExploreSwipeTabsProps) {
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const restoreForYouFeed = useCountryFeedStore((s) => s.restoreForYouFeed);
  const loadHereFeed = useCountryFeedStore((s) => s.loadHereFeed);
  const viewportCountries = useSpatialContextStore((s) => s.viewportCountries);

  const activeTab: ExploreSwipeTabId =
    previewActive ?? (discoveryMode === "here" ? "here" : "forYou");

  const onTabPress = (tab: ExploreSwipeTabId) => {
    if (previewActive) return;

    if (tab === "forYou") {
      if (discoveryMode === "forYou" && selectedRegion === null) return;
      void restoreForYouFeed();
      return;
    }

    if (discoveryMode === "here") return;
    void loadHereFeed(viewportCountries);
  };

  return (
    <View style={styles.track}>
      {TABS.map((tab) => {
        const selected = tab.id === activeTab;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              tab.id === "forYou"
                ? "Show your personalized country feed"
                : "Show countries from your map area"
            }
            onPress={() => onTabPress(tab.id)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
          >
            <Text
              style={[styles.tabLabel, selected && styles.tabLabelActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: EXPLORE_SWIPE_TAB_HEIGHT,
    padding: 4,
    borderRadius: EXPLORE_SWIPE_TAB_RADIUS,
    backgroundColor: EXPLORE_SWIPE_TAB_TRACK_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_TAB_TRACK_BORDER,
  },
  tab: {
    flex: 1,
    minHeight: EXPLORE_SWIPE_TAB_HEIGHT - 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: EXPLORE_SWIPE_TAB_RADIUS,
    paddingHorizontal: 12,
  },
  tabActive: {
    backgroundColor: EXPLORE_SWIPE_TAB_ACTIVE_BG,
  },
  tabPressed: {
    opacity: 0.88,
  },
  tabLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: EXPLORE_SWIPE_TEXT_SEGMENT,
    letterSpacing: EXPLORE_SWIPE_TEXT_SEGMENT_LETTER_SPACING,
    color: EXPLORE_SWIPE_TAB_INACTIVE_TEXT,
  },
  tabLabelActive: {
    fontFamily: "Poppins-SemiBold",
    color: EXPLORE_SWIPE_TAB_ACTIVE_TEXT,
  },
});
