import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { HeroMediaMode } from "@/components/explore/explore-swipe-card";
import { ExploreSwipeDeck } from "@/components/explore/explore-swipe-deck";
import { ExploreSwipeHeader } from "@/components/explore/explore-swipe-header";
import {
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_DECK_VERTICAL_GAP,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_HEADER,
} from "@/constants/explore-swipe-layout";
import { continentDisplayLabel } from "@/constants/regions";
import {
  isSavedCountriesFeed,
  isSavedLandmarksFeed,
  usesLandmarkQueue,
} from "@/lib/explore-discovery-mode";
import { prefetchCountryProfiles } from "@/lib/prefetch-country-profiles";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

export function ExploreFeed({
  heroMediaMode = "image",
  onHeroMediaModeChange,
  isScreenFocused = true,
}: {
  heroMediaMode?: HeroMediaMode;
  onHeroMediaModeChange?: (mode: HeroMediaMode) => void;
  /** False when another tab or stack screen (e.g. country detail) is visible. */
  isScreenFocused?: boolean;
} = {}) {
  const countries = useCountryFeedStore((s) => s.countries);
  const places = useCountryFeedStore((s) => s.places);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const status = useCountryFeedStore((s) => s.status);
  const error = useCountryFeedStore((s) => s.error);
  const setCurrentIndex = useCountryFeedStore((s) => s.setCurrentIndex);
  const loadMoreFeed = useCountryFeedStore((s) => s.loadMoreFeed);
  const setRegionFilter = useCountryFeedStore((s) => s.setRegionFilter);
  const loadHereFeed = useCountryFeedStore((s) => s.loadHereFeed);
  const loadSavedFeed = useCountryFeedStore((s) => s.loadSavedFeed);
  const loadSavedLandmarksFeed = useCountryFeedStore(
    (s) => s.loadSavedLandmarksFeed,
  );
  const loadPlacesFeed = useCountryFeedStore((s) => s.loadPlacesFeed);
  const restoreForYouFeed = useCountryFeedStore((s) => s.restoreForYouFeed);
  const viewportCountries = useSpatialContextStore((s) => s.viewportCountries);
  const savedCountries = useSavedCountriesStore((s) => s.savedCountries);
  const isLandmarkMode = usesLandmarkQueue(discoveryMode);
  const queueLength = isLandmarkMode ? places.length : countries.length;

  useEffect(() => {
    if (!isSavedCountriesFeed(discoveryMode)) return;
    void loadSavedFeed();
  }, [discoveryMode, loadSavedFeed, savedCountries]);

  const handleIndexChange = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      if (!isLandmarkMode) {
        void prefetchCountryProfiles(countries, { aroundIndex: index });
      }
    },
    [countries, isLandmarkMode, setCurrentIndex],
  );

  const handleNeedMore = useCallback(() => {
    void loadMoreFeed();
  }, [loadMoreFeed]);

  return (
    <View style={styles.feed}>
      <ExploreSwipeHeader
        heroMediaMode={heroMediaMode}
        onHeroMediaModeChange={onHeroMediaModeChange}
      />

      <View
        style={[
          styles.deckRegion,
          {
            paddingBottom: EXPLORE_SWIPE_DECK_VERTICAL_GAP + 24,
          },
        ]}
      >
        {discoveryMode === "places" &&
        places.length === 0 &&
        status !== "loading" ? (
          <View style={styles.emptyOverlay}>
            <Text style={styles.errorTitle}>No landmarks found yet</Text>
            <Text style={styles.errorMessage}>
              {selectedRegion
                ? `We couldn't find landmarks in ${continentDisplayLabel(selectedRegion)} yet. Try For You or pick another region.`
                : "Try For You or browse another region to discover landmarks."}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Browse For You feed"
              onPress={() => {
                void restoreForYouFeed();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryPressed,
              ]}
            >
              <Text style={styles.retryText}>Browse For You</Text>
            </Pressable>
          </View>
        ) : isSavedLandmarksFeed(discoveryMode) &&
          places.length === 0 &&
          status !== "loading" ? (
          <View style={styles.emptyOverlay}>
            <Text style={styles.errorTitle}>No saved landmarks yet</Text>
            <Text style={styles.errorMessage}>
              Switch to Landmarks in Explore and bookmark landmarks you want to
              revisit.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Browse For You feed"
              onPress={() => {
                void restoreForYouFeed();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryPressed,
              ]}
            >
              <Text style={styles.retryText}>Browse For You</Text>
            </Pressable>
          </View>
        ) : discoveryMode === "saved" &&
          countries.length === 0 &&
          status !== "loading" ? (
          <View style={styles.emptyOverlay}>
            <Text style={styles.errorTitle}>No saved countries yet</Text>
            <Text style={styles.errorMessage}>
              Explore the world and tap Save on places you love, then come back
              here to swipe through them.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Browse For You feed"
              onPress={() => {
                void restoreForYouFeed();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryPressed,
              ]}
            >
              <Text style={styles.retryText}>Browse For You</Text>
            </Pressable>
          </View>
        ) : status === "error" &&
          queueLength === 0 &&
          (selectedRegion !== null ||
            discoveryMode === "here" ||
            isSavedCountriesFeed(discoveryMode) ||
            isSavedLandmarksFeed(discoveryMode) ||
            discoveryMode === "places") ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>
              {discoveryMode === "here"
                ? "Couldn't load this map area"
                : isSavedCountriesFeed(discoveryMode)
                  ? "Couldn't load saved countries"
                  : isSavedLandmarksFeed(discoveryMode)
                    ? "Couldn't load saved landmarks"
                    : discoveryMode === "places"
                      ? selectedRegion
                        ? `Couldn't load landmarks in ${continentDisplayLabel(selectedRegion)}`
                        : "Couldn't load landmarks"
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
                if (isSavedCountriesFeed(discoveryMode)) {
                  void loadSavedFeed();
                  return;
                }
                if (isSavedLandmarksFeed(discoveryMode)) {
                  void loadSavedLandmarksFeed();
                  return;
                }
                if (discoveryMode === "places") {
                  void loadPlacesFeed(selectedRegion);
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
            heroMediaMode={heroMediaMode}
            isScreenFocused={isScreenFocused}
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
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  },
  deckRegion: {
    flex: 1,
  },
  errorOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyOverlay: {
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
