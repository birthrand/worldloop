import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from "react-native";

import { CountryFeedPage } from "@/components/explore/country-feed-page";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

export function ExploreFeed() {
  const [pageHeight, setPageHeight] = useState(0);
  const pageHeightRef = useRef(0);
  const countries = useCountryFeedStore((s) => s.countries);
  const status = useCountryFeedStore((s) => s.status);
  const setCurrentIndex = useCountryFeedStore((s) => s.setCurrentIndex);
  const loadMoreFeed = useCountryFeedStore((s) => s.loadMoreFeed);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;

      const index = first.index;
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
      {pageHeight > 0 ? (
        <FlatList
          style={styles.list}
          data={countries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          extraData={pageHeight}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          snapToInterval={pageHeight}
          disableIntervalMomentum
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
        />
      ) : null}

      {(status === "loading" || status === "loadingMore") && (
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
});
