import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { ExploreError } from "@/components/explore/explore-error";
import { ExploreFeed } from "@/components/explore/explore-feed";
import { ExploreFeedSkeleton } from "@/components/explore/explore-feed-skeleton";
import { ExploreSwipeWorldBackground } from "@/components/explore/explore-swipe-world-background";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

export default function ExploreScreen() {
  const countries = useCountryFeedStore((s) => s.countries);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const status = useCountryFeedStore((s) => s.status);
  const error = useCountryFeedStore((s) => s.error);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);
  const loadHereFeed = useCountryFeedStore((s) => s.loadHereFeed);
  const viewportCountries = useSpatialContextStore((s) => s.viewportCountries);

  useEffect(() => {
    if (discoveryMode === "here" || discoveryMode === "saved") return;
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

  const showInitialLoading =
    discoveryMode === "forYou" &&
    selectedRegion === null &&
    countries.length === 0 &&
    (status === "loading" || status === "idle" || status === "loadingMore");
  const showHereLoading =
    discoveryMode === "here" &&
    countries.length === 0 &&
    (status === "loading" || status === "idle");
  const showError =
    countries.length === 0 &&
    status === "error" &&
    (discoveryMode === "forYou"
      ? selectedRegion === null
      : discoveryMode === "here" ||
        discoveryMode === "saved" ||
        selectedRegion !== null);
  const showFeed =
    countries.length > 0 ||
    selectedRegion !== null ||
    discoveryMode === "here" ||
    discoveryMode === "saved";
  const activeCountry = countries[currentIndex];

  return (
    <View style={styles.screen}>
      <ExploreSwipeWorldBackground paletteCountry={activeCountry} />
      <StatusBar style="light" />

      {showError ? (
        <ExploreError
          message={error}
          onRetry={() => {
            if (discoveryMode === "here") {
              void loadHereFeed(viewportCountries);
              return;
            }
            if (discoveryMode === "saved") {
              void useCountryFeedStore.getState().loadSavedFeed();
              return;
            }
            void loadInitialFeed();
          }}
        />
      ) : showInitialLoading || showHereLoading ? (
        <ExploreFeedSkeleton />
      ) : showFeed ? (
        <ExploreFeed />
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
