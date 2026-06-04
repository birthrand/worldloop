import { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";

import { InsightCard } from "@/components/ai-explorer/insight-card";
import {
  CATEGORY_CHIPS,
  filterInsightsByCategory,
  type CategoryId,
  type InsightContent,
} from "@/data/ai-explorer-content";

type CategoryTabPagerProps = {
  selected: CategoryId;
  onSelectedChange: (id: CategoryId) => void;
  insights: InsightContent[];
  resolveInsightImage: (index: number) => string | undefined;
  onTrendingTabSelected?: () => void;
};

export function CategoryTabPager({
  selected,
  onSelectedChange,
  insights,
  resolveInsightImage,
  onTrendingTabSelected,
}: CategoryTabPagerProps) {
  const pagerRef = useRef<ScrollView>(null);
  const selectedRef = useRef(selected);
  const skipPagerSyncRef = useRef(false);
  const [pagerWidth, setPagerWidth] = useState(0);

  selectedRef.current = selected;

  const scrollPagerToCategory = useCallback(
    (category: CategoryId, animated = true) => {
      if (pagerWidth <= 0) return;

      const index = CATEGORY_CHIPS.findIndex((tab) => tab.id === category);
      if (index < 0) return;

      pagerRef.current?.scrollTo({
        x: index * pagerWidth,
        animated,
      });
    },
    [pagerWidth],
  );

  useEffect(() => {
    if (skipPagerSyncRef.current) {
      skipPagerSyncRef.current = false;
      return;
    }
    scrollPagerToCategory(selected);
  }, [selected, scrollPagerToCategory]);

  const onPagerLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width <= 0) return;
    setPagerWidth(width);
  }, []);

  useEffect(() => {
    if (pagerWidth <= 0) return;
    scrollPagerToCategory(selectedRef.current, false);
  }, [pagerWidth, scrollPagerToCategory]);

  const onPagerScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pagerWidth <= 0) return;

      const index = Math.round(event.nativeEvent.contentOffset.x / pagerWidth);
      const next = CATEGORY_CHIPS[index]?.id;
      if (!next || next === selectedRef.current) return;

      skipPagerSyncRef.current = true;
      onSelectedChange(next);

      if (next === "trending") {
        onTrendingTabSelected?.();
      }
    },
    [onSelectedChange, onTrendingTabSelected, pagerWidth],
  );

  if (pagerWidth <= 0) {
    return <View style={styles.wrap} onLayout={onPagerLayout} />;
  }

  return (
    <View style={styles.wrap} onLayout={onPagerLayout}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={onPagerScrollEnd}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {CATEGORY_CHIPS.map((tab) => {
          const panelInsights = filterInsightsByCategory(insights, tab.id);
          const isSingleColumn = panelInsights.length === 1;

          return (
            <View key={tab.id} style={[styles.page, { width: pagerWidth }]}>
              <Animated.View
                layout={Layout.springify()}
                style={styles.insightsGrid}
              >
                {panelInsights.map((insight, index) => (
                  <Animated.View
                    key={insight.id}
                    entering={FadeIn.duration(180)}
                    exiting={FadeOut.duration(140)}
                    style={
                      isSingleColumn ? styles.gridItemFull : styles.gridItemHalf
                    }
                  >
                    <InsightCard
                      insight={insight}
                      imageUri={resolveInsightImage(index)}
                      fullWidth={isSingleColumn}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -16,
  },
  pager: {
    flexGrow: 0,
  },
  page: {
    paddingHorizontal: 16,
  },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  gridItemHalf: {
    width: "47.5%",
  },
  gridItemFull: {
    width: "100%",
  },
});
