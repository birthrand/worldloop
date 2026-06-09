import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CultureEmpty } from "@/components/culture/culture-empty";
import { CultureFeed } from "@/components/culture/culture-feed";
import { ExploreError } from "@/components/explore/explore-error";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";

export default function CultureScreen() {
  const insets = useSafeAreaInsets();
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
        <View style={[styles.loading, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#fbbf24" />
          <Text style={styles.loadingText}>Loading culture clips…</Text>
        </View>
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.8)",
  },
});
