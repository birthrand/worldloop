import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ExploreError } from "@/components/explore/explore-error";
import { ExploreFeed } from "@/components/explore/explore-feed";
import { ExploreFeedSkeleton } from "@/components/explore/explore-feed-skeleton";
import {
  ExploreSwipeWorldBackground,
  type ExploreHeroMediaMode,
} from "@/components/explore/explore-swipe-world-background";
import {
  isSavedCountriesFeed,
  isSavedLandmarksFeed,
  usesLandmarkQueue,
} from "@/lib/explore-discovery-mode";
import { hasCultureVideo } from "@/lib/format-country";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

export default function ExploreScreen() {
  const isScreenFocused = useIsFocused();
  const countries = useCountryFeedStore((s) => s.countries);
  const places = useCountryFeedStore((s) => s.places);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const status = useCountryFeedStore((s) => s.status);
  const error = useCountryFeedStore((s) => s.error);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);
  const loadHereFeed = useCountryFeedStore((s) => s.loadHereFeed);
  const loadSavedLandmarksFeed = useCountryFeedStore(
    (s) => s.loadSavedLandmarksFeed,
  );
  const savedLandmarks = useSavedLandmarksStore((s) => s.savedLandmarks);
  const viewportCountries = useSpatialContextStore((s) => s.viewportCountries);

  useEffect(() => {
    if (
      discoveryMode === "here" ||
      isSavedCountriesFeed(discoveryMode) ||
      isSavedLandmarksFeed(discoveryMode) ||
      discoveryMode === "places"
    ) {
      return;
    }
    if (
      countries.length === 0 &&
      status === "idle" &&
      selectedRegion === null
    ) {
      void loadInitialFeed();
    }
  }, [
    countries.length,
    discoveryMode,
    selectedRegion,
    status,
    loadInitialFeed,
  ]);

  useEffect(() => {
    if (discoveryMode !== "here") return;
    if (countries.length > 0) return;
    if (viewportCountries.length === 0) return;
    if (status !== "idle") return;
    void loadHereFeed(viewportCountries);
  }, [
    countries.length,
    discoveryMode,
    loadHereFeed,
    status,
    viewportCountries,
  ]);

  useEffect(() => {
    if (!isSavedLandmarksFeed(discoveryMode)) return;
    void loadSavedLandmarksFeed();
  }, [discoveryMode, loadSavedLandmarksFeed, savedLandmarks]);

  const showInitialLoading =
    discoveryMode === "forYou" &&
    selectedRegion === null &&
    countries.length === 0 &&
    (status === "loading" || status === "idle" || status === "loadingMore");
  const showHereLoading =
    discoveryMode === "here" &&
    countries.length === 0 &&
    (status === "loading" || status === "idle");
  const showLandmarksLoading =
    discoveryMode === "places" &&
    places.length === 0 &&
    (status === "loading" || status === "idle");
  const showError =
    (usesLandmarkQueue(discoveryMode)
      ? places.length === 0
      : countries.length === 0) &&
    status === "error" &&
    (discoveryMode === "forYou"
      ? selectedRegion === null
      : discoveryMode === "here" ||
        isSavedCountriesFeed(discoveryMode) ||
        isSavedLandmarksFeed(discoveryMode) ||
        discoveryMode === "places" ||
        selectedRegion !== null);
  const showFeed =
    countries.length > 0 ||
    places.length > 0 ||
    selectedRegion !== null ||
    discoveryMode === "here" ||
    isSavedCountriesFeed(discoveryMode) ||
    isSavedLandmarksFeed(discoveryMode) ||
    discoveryMode === "places";
  const activeCountry = usesLandmarkQueue(discoveryMode)
    ? places[currentIndex]?.country
    : countries[currentIndex];

  const [heroMediaMode, setHeroMediaMode] =
    useState<ExploreHeroMediaMode>("image");

  useEffect(() => {
    if (
      heroMediaMode === "video" &&
      activeCountry &&
      !hasCultureVideo(activeCountry)
    ) {
      setHeroMediaMode("image");
    }
  }, [activeCountry?.name, heroMediaMode]);

  const handleHeroMediaModeChange = useCallback(
    (mode: ExploreHeroMediaMode) => {
      setHeroMediaMode(mode);
    },
    [],
  );

  return (
    <View style={styles.screen}>
      <ExploreSwipeWorldBackground
        paletteCountry={activeCountry}
        heroMediaMode={heroMediaMode}
      />
      <StatusBar style="light" />

      {showError ? (
        <ExploreError
          message={error}
          onRetry={() => {
            if (discoveryMode === "here") {
              void loadHereFeed(viewportCountries);
              return;
            }
            if (isSavedCountriesFeed(discoveryMode)) {
              void useCountryFeedStore.getState().loadSavedFeed();
              return;
            }
            if (isSavedLandmarksFeed(discoveryMode)) {
              void useCountryFeedStore.getState().loadSavedLandmarksFeed();
              return;
            }
            if (discoveryMode === "places") {
              void useCountryFeedStore
                .getState()
                .loadPlacesFeed(selectedRegion);
              return;
            }
            void loadInitialFeed();
          }}
        />
      ) : showInitialLoading || showHereLoading || showLandmarksLoading ? (
        <ExploreFeedSkeleton />
      ) : showFeed ? (
        <ExploreFeed
          heroMediaMode={heroMediaMode}
          onHeroMediaModeChange={handleHeroMediaModeChange}
          isScreenFocused={isScreenFocused}
        />
      ) : (
        <ExploreFeedSkeleton />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
