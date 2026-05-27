import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";

import { ExploreError } from "@/components/explore/explore-error";
import { ExploreFeed } from "@/components/explore/explore-feed";
import { ExploreLoading } from "@/components/explore/explore-loading";
import { useCountryFeedStore } from "@/store/use-country-feed-store";

export default function ExploreScreen() {
  const countries = useCountryFeedStore((s) => s.countries);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const status = useCountryFeedStore((s) => s.status);
  const error = useCountryFeedStore((s) => s.error);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);

  useEffect(() => {
    if (countries.length === 0 && status === "idle" && selectedRegion === null) {
      void loadInitialFeed();
    }
  }, [countries.length, selectedRegion, status, loadInitialFeed]);

  const showInitialLoading =
    selectedRegion === null &&
    countries.length === 0 &&
    (status === "loading" || status === "idle" || status === "loadingMore");
  const showError =
    selectedRegion === null && countries.length === 0 && status === "error";
  const showFeed = countries.length > 0 || selectedRegion !== null;

  return (
    <View className="flex-1 bg-midnight-navy">
      <StatusBar style="light" />

      {showError ? (
        <ExploreError
          message={error}
          onRetry={() => {
            void loadInitialFeed();
          }}
        />
      ) : showInitialLoading ? (
        <ExploreLoading />
      ) : showFeed ? (
        <ExploreFeed />
      ) : (
        <ExploreLoading />
      )}
    </View>
  );
}
