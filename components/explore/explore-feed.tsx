import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from "react-native";

import { CountryFeedPage } from "@/components/explore/country-feed-page";
import { ExploreTopBar } from "@/components/explore/explore-top-bar";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

export function ExploreFeed() {
  const [pageHeight, setPageHeight] = useState(0);
  const pageHeightRef = useRef(0);
  const listRef = useRef<FlatList<Country>>(null);
  const skipProgrammaticScrollRef = useRef(false);
  const hasSyncedInitialScrollRef = useRef(false);
  const countries = useCountryFeedStore((s) => s.countries);
  const currentIndex = useCountryFeedStore((s) => s.currentIndex);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const status = useCountryFeedStore((s) => s.status);
  const setCurrentIndex = useCountryFeedStore((s) => s.setCurrentIndex);
  const loadMoreFeed = useCountryFeedStore((s) => s.loadMoreFeed);

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
  }, [selectedRegion]);

  // Only scroll programmatically (region filter, focus country, layout).
  // User swipes update currentIndex via onViewableItemsChanged — do not fight that scroll.
  useEffect(() => {
    if (pageHeight <= 0 || countries.length === 0) return;

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
      if (
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
    itemVisiblePercentThreshold: 60,
  }).current;

  const onFeedLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    if (height > 0 && height !== pageHeightRef.current) {
      pageHeightRef.current = height;
      setPageHeight(height);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Country }) => (
      <CountryFeedPage country={item} pageHeight={pageHeight} />
    ),
    [pageHeight],
  );

  const keyExtractor = useCallback((item: Country) => item.name, []);

  return (
    <View className="flex-1 bg-midnight-navy" onLayout={onFeedLayout}>
      <View pointerEvents="box-none" style={styles.topBarOverlay}>
        <ExploreTopBar />
      </View>
      {pageHeight > 0 ? (
        <FlatList
          ref={listRef}
          style={styles.list}
          data={countries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          extraData={`${pageHeight}-${selectedRegion ?? "for-you"}`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  topBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
});
