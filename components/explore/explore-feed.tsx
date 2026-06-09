import { CountryFeedPage } from "@/components/explore/country-feed-page";
import { ExploreTopBar } from "@/components/explore/explore-top-bar";
import { getExploreHeaderContentHeight } from "@/constants/explore-feed-layout";
import { getCountryImages } from "@/lib/format-country";
import { prefetchCountryProfiles } from "@/lib/prefetch-country-profiles";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";
import type { Country } from "@/types/country";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ExploreFeed() {
  const insets = useSafeAreaInsets();
  const [pageHeight, setPageHeight] = useState(0);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const pageHeightRef = useRef(0);
  const listRef = useRef<FlatList<Country>>(null);
  const skipProgrammaticScrollRef = useRef(false);
  const hasSyncedInitialScrollRef = useRef(false);
  const countries = useCountryFeedStore((s) => s.countries);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const focusEpoch = useCountryFeedStore((s) => s.focusEpoch);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const status = useCountryFeedStore((s) => s.status);
  const setCurrentIndex = useCountryFeedStore((s) => s.setCurrentIndex);
  const loadMoreFeed = useCountryFeedStore((s) => s.loadMoreFeed);
  const setRegionFilter = useCountryFeedStore((s) => s.setRegionFilter);
  const loadHereFeed = useCountryFeedStore((s) => s.loadHereFeed);
  const viewportCountries = useSpatialContextStore((s) => s.viewportCountries);
  const error = useCountryFeedStore((s) => s.error);

  const feedListKey = `${discoveryMode}-${selectedRegion ?? "for-you"}-${focusEpoch}`;
  const headerContentInset = getExploreHeaderContentHeight(insets.top, {
    hereMode: discoveryMode === "here",
  });
  const currentCountry = countries[currentIndex];
  const currentHeroImages = useMemo(
    () => (currentCountry ? getCountryImages(currentCountry) : []),
    [currentCountry],
  );

  useEffect(() => {
    setActiveHeroIndex(0);
  }, [currentIndex, currentCountry?.name]);

  const scrollToCurrentIndex = useCallback(
    (animated: boolean) => {
      if (pageHeight <= 0 || countries.length === 0) return;
      const index = Math.max(0, Math.min(currentIndex, countries.length - 1));
      listRef.current?.scrollToIndex({ index, animated });
    },
    [countries.length, currentIndex, pageHeight],
  );

  useEffect(() => {
    hasSyncedInitialScrollRef.current = false;
  }, [selectedRegion, discoveryMode]);

  // Only scroll programmatically when restoring a non-zero index (e.g. layout).
  // Search/home focus remounts the list at index 0 — never scroll the feed to a deep index.
  // User swipes update currentIndex via onViewableItemsChanged — do not fight that scroll.
  useEffect(() => {
    if (pageHeight <= 0 || countries.length === 0 || currentIndex === 0) return;

    if (skipProgrammaticScrollRef.current) {
      skipProgrammaticScrollRef.current = false;
      return;
    }

    const animated = hasSyncedInitialScrollRef.current;
    hasSyncedInitialScrollRef.current = true;
    scrollToCurrentIndex(animated);
  }, [currentIndex, countries.length, pageHeight, scrollToCurrentIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;

      const index = first.index;
      skipProgrammaticScrollRef.current = true;
      setCurrentIndex(index);

      const state = useCountryFeedStore.getState();
      const country = state.countries[index];
      if (country) {
        useDiscoveryProgressStore.getState().recordCountryVisit(country);
        void prefetchCountryProfiles(state.countries, { aroundIndex: index });
      }

      if (
        state.discoveryMode === "forYou" &&
        state.nextCursor !== null &&
        index >= state.countries.length - 2 &&
        state.status !== "loading" &&
        state.status !== "loadingMore"
      ) {
        void loadMoreFeed();
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onFeedLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    if (height > 0 && height !== pageHeightRef.current) {
      pageHeightRef.current = height;
      setPageHeight(height);
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Country; index: number }) => (
      <CountryFeedPage
        country={item}
        pageHeight={pageHeight}
        headerContentInset={headerContentInset}
        isActive={index === currentIndex}
        onActiveHeroIndexChange={setActiveHeroIndex}
      />
    ),
    [currentIndex, headerContentInset, pageHeight],
  );

  const keyExtractor = useCallback((item: Country) => item.name, []);

  return (
    <View style={styles.feed}>
      <View style={styles.feedBody} onLayout={onFeedLayout}>
        {pageHeight > 0 ? (
          <FlatList
            key={feedListKey}
            ref={listRef}
            style={styles.list}
            data={countries}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            extraData={pageHeight}
            initialScrollIndex={
              currentIndex > 0 && currentIndex < countries.length
                ? currentIndex
                : undefined
            }
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews
            onScrollToIndexFailed={(info) => {
              const retry = () => {
                listRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                });
              };
              requestAnimationFrame(retry);
            }}
          />
        ) : null}

        {status === "loading" && countries.length === 0 && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        )}

        {status === "error" &&
          countries.length === 0 &&
          (selectedRegion !== null || discoveryMode === "here") && (
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
                accessibilityLabel={
                  discoveryMode === "here"
                    ? "Retry loading map area countries"
                    : `Retry loading ${selectedRegion}`
                }
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
          )}
      </View>
      <ExploreTopBar
        overlay
        backdropImageUri={currentHeroImages[activeHeroIndex]}
        backdropFlag={currentCountry?.flag}
        backdropIso2={currentCountry?.cca2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
  },
  feedBody: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  list: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 19, 43, 0.92)",
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.7)",
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
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
});
