import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { CultureEmpty } from "@/components/culture/culture-empty";
import { CultureFeed } from "@/components/culture/culture-feed";
import { CultureFeedSkeleton } from "@/components/culture/culture-feed-skeleton";
import { ExploreError } from "@/components/explore/explore-error";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";

export default function CultureScreen() {
  const countries = useCultureFeedStore((s) => s.countries);
  const selectedRegion = useCultureFeedStore((s) => s.selectedRegion);
  const hasLoadedOnce = useCultureFeedStore((s) => s.hasLoadedOnce);
  const status = useCultureFeedStore((s) => s.status);
  const error = useCultureFeedStore((s) => s.error);
  const loadInitialFeed = useCultureFeedStore((s) => s.loadInitialFeed);
  const setRegionFilter = useCultureFeedStore((s) => s.setRegionFilter);

  useEffect(() => {
    if (!hasLoadedOnce && status === "idle") {
      void loadInitialFeed();
    }
  }, [hasLoadedOnce, loadInitialFeed, status]);

  const showLoading =
    !hasLoadedOnce ||
    (countries.length === 0 &&
      (status === "loading" || status === "loadingMore"));
  const showError =
    countries.length === 0 &&
    status === "error" &&
    (selectedRegion !== null || hasLoadedOnce);
  const showEmpty =
    hasLoadedOnce && countries.length === 0 && status === "idle";

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {showError ? (
        <ExploreError
          message={error}
          onRetry={() => {
            if (selectedRegion !== null) {
              void setRegionFilter(selectedRegion);
              return;
            }
            void loadInitialFeed({ force: true });
          }}
        />
      ) : showLoading ? (
        <CultureFeedSkeleton />
      ) : showEmpty ? (
        <CultureEmpty
          onRetry={() => {
            if (selectedRegion !== null) {
              void setRegionFilter(selectedRegion);
              return;
            }
            void loadInitialFeed({ force: true });
          }}
        />
      ) : (
        <CultureFeed />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
});
