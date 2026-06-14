import { Ionicons } from "@expo/vector-icons";
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
  PLACES_TAB,
  SAVED_TAB,
  type ExploreHeaderTab,
} from "@/constants/regions";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

type ExploreFeedMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type FeedMenuRowProps = {
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

function FeedMenuRow({
  label,
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
      {selected ? (
        <Ionicons
          name="checkmark"
          size={18}
          color={WORLDLOOP_HEADER_ACCENT_COLOR}
        />
      ) : null}
    </Pressable>
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
  const loadPlacesFeed = useCountryFeedStore((s) => s.loadPlacesFeed);
  const savedCount = useSavedCountriesStore((s) => s.savedCountries.length);
  const focusedRegion = useSpatialContextStore(
    (s) => s.discoveryScope.focusedRegion,
  );

  const headerTabs: ExploreHeaderTab[] =
    discoveryMode === "here"
      ? [
          FOR_YOU_TAB,
          SAVED_TAB,
          PLACES_TAB,
          HERE_TAB,
          ...EXPLORE_HEADER_TABS.slice(1),
        ]
      : [FOR_YOU_TAB, SAVED_TAB, PLACES_TAB, ...EXPLORE_HEADER_TABS.slice(1)];

  const selectedTab: ExploreHeaderTab =
    discoveryMode === "saved"
      ? SAVED_TAB
      : discoveryMode === "places"
        ? PLACES_TAB
        : discoveryMode === "here"
          ? HERE_TAB
          : selectedRegion === null
            ? FOR_YOU_TAB
            : (selectedRegion as ExploreHeaderTab);

  const hereScopeLabel = focusedRegion
    ? continentDisplayLabel(focusedRegion)
    : "Map area";

  const onTabPress = (name: ExploreHeaderTab) => {
    if (name === FOR_YOU_TAB) {
      if (discoveryMode === "forYou" && selectedRegion === null) {
        onClose();
        return;
      }
      void restoreForYouFeed();
      onClose();
      return;
    }

    if (name === SAVED_TAB) {
      if (discoveryMode === "saved") {
        onClose();
        return;
      }
      void loadSavedFeed();
      onClose();
      return;
    }

    if (name === PLACES_TAB) {
      if (discoveryMode === "places") {
        onClose();
        return;
      }
      void loadPlacesFeed();
      onClose();
      return;
    }

    if (name === HERE_TAB) {
      onClose();
      return;
    }

    if (!isContinent(name)) return;

    if (selectedRegion === name && discoveryMode === "region") {
      void setRegionFilter(null);
      onClose();
      return;
    }

    void setRegionFilter(name);
    onClose();
  };

  const continentStartIndex = headerTabs.findIndex((tab) =>
    tab === HERE_TAB ? discoveryMode === "here" : isContinent(tab),
  );

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
      </View>

      <View style={styles.menuPanel}>
        {headerTabs.map((name, index) => {
          const selected = name === selectedTab;
          const showPersonalHeader = index === 0 && name === FOR_YOU_TAB;
          const showContinentsHeader =
            index === continentStartIndex && continentStartIndex >= 0;

          const accessibilityLabel =
            name === FOR_YOU_TAB
              ? "Show your personalized country feed"
              : name === SAVED_TAB
                ? selected
                  ? `Saved countries, ${savedCount} items`
                  : `Show ${savedCount} saved countries as a swipe deck`
                : name === PLACES_TAB
                  ? selected
                    ? `Places mode, ${placesCount} landmarks`
                    : "Show landmarks from your For You country pool"
                  : name === HERE_TAB
                    ? `Here mode: ${hereScopeLabel}, ${countryCount} countries`
                    : selected
                      ? `Clear ${name} filter and show For You feed`
                      : `Show countries in ${name}`;

          const label =
            name === FOR_YOU_TAB
              ? name
              : name === SAVED_TAB
                ? savedCount > 0
                  ? `${name} (${savedCount})`
                  : name
                : name === PLACES_TAB
                  ? placesCount > 0 && discoveryMode === "places"
                    ? `${name} (${placesCount})`
                    : name
                  : name === HERE_TAB
                    ? name
                    : continentTabLabel(name, true);

          return (
            <View key={name}>
              {showPersonalHeader ? (
                <Text style={styles.sectionLabel}>Personal</Text>
              ) : null}
              {showContinentsHeader ? (
                <Text style={styles.sectionLabel}>World</Text>
              ) : null}
              {index > 0 && !showContinentsHeader && !showPersonalHeader ? (
                <View style={styles.menuDivider} />
              ) : null}
              <FeedMenuRow
                label={label}
                selected={selected}
                accessibilityLabel={accessibilityLabel}
                onPress={() => onTabPress(name)}
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
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  menuPanel: {
    gap: 0,
    marginTop: 4,
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
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
