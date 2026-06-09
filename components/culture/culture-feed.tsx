import { useIsFocused } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from "react-native";

import { CultureCountryPage } from "@/components/culture/culture-country-page";
import { CultureTopBar } from "@/components/culture/culture-top-bar";
import { prefetchCountryProfiles } from "@/lib/prefetch-country-profiles";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import type { Country } from "@/types/country";

export function CultureFeed() {
  const isTabFocused = useIsFocused();
  const [pageHeight, setPageHeight] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const pageHeightRef = useRef(0);
  const listRef = useRef<FlatList<Country>>(null);

  const countries = useCultureFeedStore((s) => s.countries);
  const selectedRegion = useCultureFeedStore((s) => s.selectedRegion);
  const currentIndex = useCultureFeedStore((s) => s.currentIndex);
  const status = useCultureFeedStore((s) => s.status);
  const feedListKey = selectedRegion ?? "for-you";
  const setCurrentIndex = useCultureFeedStore((s) => s.setCurrentIndex);
  const loadMoreFeed = useCultureFeedStore((s) => s.loadMoreFeed);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;

      const index = first.index;
      setCurrentIndex(index);

      const state = useCultureFeedStore.getState();
      const country = state.countries[index];
      if (country) {
        useDiscoveryProgressStore.getState().recordCountryVisit(country);
        void prefetchCountryProfiles(state.countries, { aroundIndex: index });
      }

      if (
        state.selectedRegion === null &&
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
    const { width, height } = event.nativeEvent.layout;
    const nextHeight = Math.round(height);
    const nextWidth = Math.round(width);
    if (nextHeight > 0 && nextHeight !== pageHeightRef.current) {
      pageHeightRef.current = nextHeight;
      setPageHeight(nextHeight);
      setPageWidth(nextWidth);
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Country; index: number }) => (
      <CultureCountryPage
        country={item}
        pageHeight={pageHeight}
        pageWidth={pageWidth}
        isActive={isTabFocused && index === currentIndex}
      />
    ),
    [currentIndex, isTabFocused, pageHeight, pageWidth],
  );

  const keyExtractor = useCallback((item: Country) => item.name, []);

  return (
    <View style={styles.feed}>
      <View style={styles.feedBody} onLayout={onFeedLayout}>
        {pageHeight > 0 && pageWidth > 0 ? (
          <FlatList
            key={feedListKey}
            ref={listRef}
            style={styles.list}
            data={countries}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            extraData={`${pageHeight}-${currentIndex}-${isTabFocused}`}
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
              requestAnimationFrame(() => {
                listRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                });
              });
            }}
          />
        ) : null}

        {status === "loadingMore" ? (
          <View style={styles.loadingMore} pointerEvents="none">
            <ActivityIndicator size="small" color="#fbbf24" />
          </View>
        ) : null}
      </View>

      <CultureTopBar />
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
  loadingMore: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
