import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeDismissSheet } from "@/components/explore/swipe-dismiss-sheet";
import { WORLDLOOP_HEADER_ACCENT_COLOR } from "@/components/worldloop-header";
import {
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
} from "@/constants/explore-swipe-layout";
import {
  continentDisplayLabel,
  continentTabLabel,
  EXPLORE_HEADER_TABS,
  FOR_YOU_TAB,
  HERE_TAB,
  isContinent,
  SAVED_TAB,
  type ExploreHeaderTab,
} from "@/constants/regions";
import {
  isSavedCountriesFeed,
  isSavedLandmarksFeed,
} from "@/lib/explore-discovery-mode";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";
import type { DiscoveryScopeMode } from "@/types/geo";

type BrowseFeedMenuTab = "countries" | "landmarks";

type ExploreFeedMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type FeedMenuRowProps = {
  label: string;
  count?: number;
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

function FeedMenuRow({
  label,
  count,
  selected,
  accessibilityLabel,
  onPress,
}: FeedMenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <Text
        style={[styles.menuLabel, selected && styles.menuLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.menuTrailing}>
        {count !== undefined ? (
          <Text style={styles.menuCount}>{count}</Text>
        ) : null}
        {selected ? (
          <Ionicons
            name="checkmark"
            size={18}
            color={WORLDLOOP_HEADER_ACCENT_COLOR}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function resolveBrowseMenuTab(mode: DiscoveryScopeMode): BrowseFeedMenuTab {
  return mode === "places" || mode === "savedLandmarks"
    ? "landmarks"
    : "countries";
}

type BrowseFeedMenuTabsProps = {
  activeTab: BrowseFeedMenuTab;
  onTabChange: (tab: BrowseFeedMenuTab) => void;
};

function BrowseFeedMenuTabs({
  activeTab,
  onTabChange,
}: BrowseFeedMenuTabsProps) {
  const handlePress = (tab: BrowseFeedMenuTab) => {
    if (tab === activeTab) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
  };

  return (
    <View style={styles.menuTabsRow}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "countries" }}
        accessibilityLabel="Countries feed filters"
        onPress={() => handlePress("countries")}
        style={({ pressed }) => [
          styles.menuTab,
          activeTab === "countries" && styles.menuTabSelected,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.menuTabLabel,
            activeTab === "countries"
              ? styles.menuTabLabelSelected
              : styles.menuTabLabelIdle,
          ]}
        >
          Countries
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "landmarks" }}
        accessibilityLabel="Landmarks feed filters"
        onPress={() => handlePress("landmarks")}
        style={({ pressed }) => [
          styles.menuTab,
          activeTab === "landmarks" && styles.menuTabSelected,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.menuTabLabel,
            activeTab === "landmarks"
              ? styles.menuTabLabelSelected
              : styles.menuTabLabelIdle,
          ]}
        >
          Landmarks
        </Text>
      </Pressable>
    </View>
  );
}

export function ExploreFeedMenuSheet({
  visible,
  onClose,
}: ExploreFeedMenuSheetProps) {
  const insets = useSafeAreaInsets();
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const countryCount = useCountryFeedStore((s) => s.countries.length);
  const placesCount = useCountryFeedStore((s) => s.places.length);
  const restoreForYouFeed = useCountryFeedStore((s) => s.restoreForYouFeed);
  const setRegionFilter = useCountryFeedStore((s) => s.setRegionFilter);
  const loadSavedFeed = useCountryFeedStore((s) => s.loadSavedFeed);
  const loadSavedLandmarksFeed = useCountryFeedStore(
    (s) => s.loadSavedLandmarksFeed,
  );
  const loadPlacesFeed = useCountryFeedStore((s) => s.loadPlacesFeed);
  const savedCountriesCount = useSavedCountriesStore(
    (s) => s.savedCountries.length,
  );
  const savedLandmarksCount = useSavedLandmarksStore(
    (s) => s.savedLandmarks.length,
  );
  const focusedRegion = useSpatialContextStore(
    (s) => s.discoveryScope.focusedRegion,
  );
  const [menuTab, setMenuTab] = useState<BrowseFeedMenuTab>(() =>
    resolveBrowseMenuTab(discoveryMode),
  );
  useEffect(() => {
    if (!visible) return;
    setMenuTab(resolveBrowseMenuTab(discoveryMode));
  }, [visible, discoveryMode]);

  const exploreTabs: ExploreHeaderTab[] =
    discoveryMode === "here"
      ? [HERE_TAB, ...EXPLORE_HEADER_TABS.slice(1)]
      : [...EXPLORE_HEADER_TABS.slice(1)];

  const hereScopeLabel = focusedRegion
    ? continentDisplayLabel(focusedRegion)
    : "Map area";

  const onForYouPress = () => {
    if (menuTab === "landmarks") {
      if (discoveryMode === "places" && selectedRegion === null) {
        onClose();
        return;
      }
      void loadPlacesFeed(null);
      onClose();
      return;
    }

    if (discoveryMode === "forYou" && selectedRegion === null) {
      onClose();
      return;
    }
    void restoreForYouFeed();
    onClose();
  };

  const onSavedPress = () => {
    if (menuTab === "landmarks") {
      const feedPlacesCount = useCountryFeedStore.getState().places.length;
      const needsSavedLandmarksReload =
        isSavedLandmarksFeed(discoveryMode) &&
        savedLandmarksCount > 0 &&
        feedPlacesCount === 0;

      if (isSavedLandmarksFeed(discoveryMode) && !needsSavedLandmarksReload) {
        onClose();
        return;
      }
      void loadSavedLandmarksFeed();
      onClose();
      return;
    }

    if (isSavedCountriesFeed(discoveryMode)) {
      onClose();
      return;
    }
    void loadSavedFeed();
    onClose();
  };

  const onExploreTabPress = (name: ExploreHeaderTab) => {
    if (name === HERE_TAB) {
      onClose();
      return;
    }

    if (!isContinent(name)) return;

    if (menuTab === "landmarks") {
      if (selectedRegion === name && discoveryMode === "places") {
        void loadPlacesFeed(null);
        onClose();
        return;
      }

      void loadPlacesFeed(name);
      onClose();
      return;
    }

    if (selectedRegion === name && discoveryMode === "region") {
      void setRegionFilter(null);
      onClose();
      return;
    }

    void setRegionFilter(name);
    onClose();
  };

  const selectedExploreTab: ExploreHeaderTab | null =
    discoveryMode === "here"
      ? HERE_TAB
      : selectedRegion === null
        ? null
        : (selectedRegion as ExploreHeaderTab);

  const forYouSelected =
    menuTab === "landmarks"
      ? discoveryMode === "places" && selectedRegion === null
      : discoveryMode === "forYou" && selectedRegion === null;

  const forYouAccessibilityLabel =
    menuTab === "landmarks"
      ? discoveryMode === "places"
        ? `Landmarks mode, ${placesCount} landmarks`
        : "Show landmarks from your For You country pool"
      : "Show your personalized country feed";

  const savedSelected =
    menuTab === "landmarks"
      ? isSavedLandmarksFeed(discoveryMode)
      : isSavedCountriesFeed(discoveryMode);

  const savedCount =
    menuTab === "landmarks" ? savedLandmarksCount : savedCountriesCount;

  const savedAccessibilityLabel =
    menuTab === "landmarks"
      ? savedSelected
        ? `Saved landmarks, ${savedLandmarksCount} items`
        : `Show ${savedLandmarksCount} saved landmarks as a swipe deck`
      : savedSelected
        ? `Saved countries, ${savedCountriesCount} items`
        : `Show ${savedCountriesCount} saved countries as a swipe deck`;

  return (
    <SwipeDismissSheet
      visible={visible}
      onClose={onClose}
      sheetStyle={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
      backdropAccessibilityLabel="Close feed filters"
      accessibilityLabel="Browse feed filters"
    >
      <View style={styles.handleWrap}>
        <View style={styles.handleBar} />
      </View>

      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Browse feed</Text>
        <BrowseFeedMenuTabs activeTab={menuTab} onTabChange={setMenuTab} />
      </View>

      <View style={styles.menuPanel}>
        <Text style={styles.sectionLabel}>Personal</Text>
        <FeedMenuRow
          label={FOR_YOU_TAB}
          selected={forYouSelected}
          accessibilityLabel={forYouAccessibilityLabel}
          onPress={onForYouPress}
        />
        <FeedMenuRow
          label={SAVED_TAB}
          count={savedCount}
          selected={savedSelected}
          accessibilityLabel={savedAccessibilityLabel}
          onPress={onSavedPress}
        />

        <Text style={[styles.sectionLabel, styles.exploreSectionLabel]}>
          Explore
        </Text>
        {exploreTabs.map((name, index) => {
          const selected = name === selectedExploreTab;

          const accessibilityLabel =
            name === HERE_TAB
              ? menuTab === "landmarks"
                ? `Here mode: ${hereScopeLabel}, ${placesCount} landmarks`
                : `Here mode: ${hereScopeLabel}, ${countryCount} countries`
              : menuTab === "landmarks"
                ? selected && discoveryMode === "places"
                  ? `Clear ${name} filter and show For You landmarks`
                  : `Show landmarks in ${name}`
                : selected
                  ? `Clear ${name} filter and show For You feed`
                  : `Show countries in ${name}`;

          const label =
            name === HERE_TAB ? name : continentTabLabel(name, true);

          return (
            <View key={name}>
              {index > 0 ? <View style={styles.menuDivider} /> : null}
              <FeedMenuRow
                label={label}
                selected={selected}
                accessibilityLabel={accessibilityLabel}
                onPress={() => onExploreTabPress(name)}
              />
            </View>
          );
        })}
      </View>
    </SwipeDismissSheet>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
    gap: 4,
  },
  handleWrap: {
    alignItems: "center",
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  sheetHeader: {
    marginBottom: 2,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  menuPanel: {
    gap: 0,
    marginTop: 8,
  },
  menuTabsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  menuTab: {
    paddingTop: 2,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -StyleSheet.hairlineWidth,
  },
  menuTabSelected: {
    borderBottomColor: "#FFFFFF",
  },
  menuTabLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  menuTabLabelSelected: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
  },
  menuTabLabelIdle: {
    color: "rgba(255, 255, 255, 0.42)",
    fontFamily: "Poppins-Regular",
  },
  exploreSectionLabel: {
    marginTop: 16,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 48,
    paddingVertical: 6,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    includeFontPadding: false,
  },
  menuLabelSelected: {
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  menuTrailing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    minWidth: 40,
  },
  menuCount: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.42)",
    textAlign: "right",
    minWidth: 18,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
