import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ExploreSwipeDeck } from "@/components/explore/explore-swipe-deck";
import { ExploreSwipeHeader } from "@/components/explore/explore-swipe-header";
import {
  EXPLORE_SWIPE_DECK_VERTICAL_GAP,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_HEADER,
} from "@/constants/explore-swipe-layout";
import { prefetchCountryProfiles } from "@/lib/prefetch-country-profiles";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

export function ExploreFeed() {
  const tabBarHeight = useBottomTabBarHeight();
  const countries = useCountryFeedStore((s) => s.countries);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const status = useCountryFeedStore((s) => s.status);
  const error = useCountryFeedStore((s) => s.error);
  const setCurrentIndex = useCountryFeedStore((s) => s.setCurrentIndex);
  const loadMoreFeed = useCountryFeedStore((s) => s.loadMoreFeed);
  const setRegionFilter = useCountryFeedStore((s) => s.setRegionFilter);
  const loadHereFeed = useCountryFeedStore((s) => s.loadHereFeed);
  const viewportCountries = useSpatialContextStore((s) => s.viewportCountries);

  const handleIndexChange = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      const country = countries[index];
      if (country) {
        useDiscoveryProgressStore.getState().recordCountryVisit(country);
        void prefetchCountryProfiles(countries, { aroundIndex: index });
      }
    },
    [countries, setCurrentIndex],
  );

  const handleNeedMore = useCallback(() => {
    void loadMoreFeed();
  }, [loadMoreFeed]);

  return (
    <View style={styles.feed}>
      <ExploreSwipeHeader />

      <View
        style={[
          styles.deckRegion,
          {
            paddingBottom: EXPLORE_SWIPE_DECK_VERTICAL_GAP + 24,
          },
        ]}
      >
        {status === "loading" && countries.length === 0 ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        ) : null}

        {status === "error" &&
        countries.length === 0 &&
        (selectedRegion !== null || discoveryMode === "here") ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>
              {discoveryMode === "here"
                ? "Couldn't load this map area"
                : `Couldn't load ${selectedRegion}`}
            </Text>
            <Text style={styles.errorMessage}>
              {error ?? "Check that the backend is running and try again."}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading feed"
              onPress={() => {
                if (discoveryMode === "here") {
                  void loadHereFeed(viewportCountries);
                  return;
                }
                void setRegionFilter(selectedRegion);
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryPressed,
              ]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ExploreSwipeDeck
            countries={countries}
            currentIndex={currentIndex}
            onIndexChange={handleIndexChange}
            onNeedMore={handleNeedMore}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
    backgroundColor: "transparent",
  },
  deckRegion: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    zIndex: 5,
  },
  errorOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: EXPLORE_SWIPE_TEXT_HEADER,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
    justifyContent: "center",
  },
  retryPressed: {
    opacity: 0.9,
  },
  retryText: {
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    fontFamily: "Poppins-SemiBold",
    color: "#000000",
  },
});
