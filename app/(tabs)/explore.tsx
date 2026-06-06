import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";

import { ExploreError } from "@/components/explore/explore-error";
import { ExploreFeed } from "@/components/explore/explore-feed";
import { ExploreLoading } from "@/components/explore/explore-loading";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

export default function ExploreScreen() {
  const countries = useCountryFeedStore((s) => s.countries);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const status = useCountryFeedStore((s) => s.status);
  const error = useCountryFeedStore((s) => s.error);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);
  const loadHereFeed = useCountryFeedStore((s) => s.loadHereFeed);
  const viewportCountries = useSpatialContextStore((s) => s.viewportCountries);

  useEffect(() => {
    if (discoveryMode === "here") return;
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
      : discoveryMode === "here" || selectedRegion !== null);
  const showFeed =
    countries.length > 0 || selectedRegion !== null || discoveryMode === "here";

  return (
    <View className="flex-1 bg-midnight-navy">
      <StatusBar style="light" />

      {showError ? (
        <ExploreError
          message={error}
          onRetry={() => {
            if (discoveryMode === "here") {
              void loadHereFeed(viewportCountries);
              return;
            }
            void loadInitialFeed();
          }}
        />
      ) : showInitialLoading || showHereLoading ? (
        <ExploreLoading />
      ) : showFeed ? (
        <ExploreFeed />
      ) : (
        <ExploreLoading />
      )}
    </View>
  );
}
