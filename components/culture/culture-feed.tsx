import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";

import { CultureCountryPage } from "@/components/culture/culture-country-page";
import { CultureTopBar } from "@/components/culture/culture-top-bar";
import { prefetchCountryProfiles } from "@/lib/prefetch-country-profiles";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";
import type { Country } from "@/types/country";

export function CultureFeed() {
  const isTabFocused = useIsFocused();
  const [pageHeight, setPageHeight] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const pageHeightRef = useRef(0);
  const pageWidthRef = useRef(0);
  const listRef = useRef<FlatList<Country>>(null);

  const countries = useCultureFeedStore((s) => s.countries);
  const selectedRegion = useCultureFeedStore((s) => s.selectedRegion);
  const currentIndex = useCultureFeedStore((s) => s.currentIndex);
  const focusEpoch = useCultureFeedStore((s) => s.focusEpoch);
  const status = useCultureFeedStore((s) => s.status);
  const feedListKey = `${selectedRegion ?? "for-you"}-${focusEpoch}`;
  const setCurrentIndex = useCultureFeedStore((s) => s.setCurrentIndex);
  const extendCultureFeedAtEnd = useCultureFeedStore(
    (s) => s.extendCultureFeedAtEnd,
  );
  const refreshCultureFeed = useCultureFeedStore((s) => s.refreshCultureFeed);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollOffsetYRef = useRef(0);
  const lastVisibleIndexRef = useRef(0);

  useEffect(() => {
    setIsHeaderVisible(true);
    lastScrollOffsetYRef.current = 0;
    lastVisibleIndexRef.current = 0;
  }, [feedListKey]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;

      const index = first.index;
      const previousIndex = lastVisibleIndexRef.current;

      if (index > previousIndex) {
        setIsHeaderVisible(false);
      } else if (index < previousIndex) {
        setIsHeaderVisible(true);
      }

      lastVisibleIndexRef.current = index;
      setCurrentIndex(index);

      const state = useCultureFeedStore.getState();
      const country = state.countries[index];
      if (country) {
        void prefetchCountryProfiles(state.countries, { aroundIndex: index });
      }

      if (
        index >= state.countries.length - 2 &&
        state.status !== "loading" &&
        state.status !== "loadingMore"
      ) {
        void extendCultureFeedAtEnd();
      }
    },
    [extendCultureFeedAtEnd, setCurrentIndex],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onFeedLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const nextHeight = Math.round(height);
    const nextWidth = Math.round(width);
    if (nextHeight <= 0 || nextWidth <= 0) return;

    const heightChanged = nextHeight !== pageHeightRef.current;
    const widthChanged = nextWidth !== pageWidthRef.current;
    if (!heightChanged && !widthChanged) return;

    if (heightChanged) {
      pageHeightRef.current = nextHeight;
      setPageHeight(nextHeight);
    }
    if (widthChanged) {
      pageWidthRef.current = nextWidth;
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

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCultureFeed();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCultureFeed]);

  const onFeedScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const delta = offsetY - lastScrollOffsetYRef.current;

      if (delta < -8) {
        setIsHeaderVisible(true);
      } else if (delta > 8) {
        setIsHeaderVisible(false);
      }

      lastScrollOffsetYRef.current = offsetY;
    },
    [],
  );

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
            extraData={`${pageHeight}-${pageWidth}-${currentIndex}-${isTabFocused}`}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onFeedScroll}
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
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#fbbf24"
                colors={["#fbbf24"]}
              />
            }
          />
        ) : null}

        {status === "loadingMore" ? (
          <View style={styles.loadingMore} pointerEvents="none">
            <ActivityIndicator size="small" color="#fbbf24" />
          </View>
        ) : null}
      </View>

      <CultureTopBar visible={isHeaderVisible} />
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
