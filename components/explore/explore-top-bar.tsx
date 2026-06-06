import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassIconButton } from "@/components/explore/glass-icon-button";
import {
  continentDisplayLabel,
  continentTabLabel,
  EXPLORE_HEADER_TABS,
  FOR_YOU_TAB,
  HERE_TAB,
  isContinent,
  type ExploreHeaderTab,
} from "@/constants/regions";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

const PROGRESSIVE_EASING = Easing.out(Easing.cubic);
const PROGRESSIVE_MIN_SCROLL_MS = 250;
const PROGRESSIVE_MAX_SCROLL_MS = 550;
const PROGRESSIVE_DISTANCE_TO_MS = 0.6;
const SCROLL_POSITION_EPSILON = 2;
/** Place selected tab center at this fraction of the viewport width. */
const TAB_ANCHOR_RATIO = 0.5;
const TAB_EDGE_PADDING = 8;
/** Shared row height — tab labels and search icon align on one centerline. */
const HEADER_ROW_HEIGHT = 44;
const UNDERLINE_HEIGHT = 2;
const LABEL_UNDERLINE_GAP = 2;
const TAB_UNDERLINE_INSET = UNDERLINE_HEIGHT + LABEL_UNDERLINE_GAP;
/** Fixed underline width — only horizontal position changes per tab. */
const UNDERLINE_WIDTH = 40;

type TabLayout = { x: number; width: number };

type UnderlineLayout = {
  left: number;
  width: number;
  visible: boolean;
};

export function ExploreTopBar() {
  const insets = useSafeAreaInsets();
  const openSearch = useSearchUiStore((s) => s.openSearch);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const countryCount = useCountryFeedStore((s) => s.countries.length);
  const restoreForYouFeed = useCountryFeedStore((s) => s.restoreForYouFeed);
  const setRegionFilter = useCountryFeedStore((s) => s.setRegionFilter);
  const focusedRegion = useSpatialContextStore(
    (s) => s.discoveryScope.focusedRegion,
  );

  const headerTabs: ExploreHeaderTab[] =
    discoveryMode === "here"
      ? [FOR_YOU_TAB, HERE_TAB, ...EXPLORE_HEADER_TABS.slice(1)]
      : [...EXPLORE_HEADER_TABS];

  const selectedTab: ExploreHeaderTab =
    discoveryMode === "here"
      ? HERE_TAB
      : selectedRegion === null
        ? FOR_YOU_TAB
        : (selectedRegion as ExploreHeaderTab);
  const hasActiveFilter = discoveryMode === "here" || selectedRegion !== null;

  const hereScopeLabel = focusedRegion
    ? continentDisplayLabel(focusedRegion)
    : "Map area";

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollViewWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const tabLayoutsRef = useRef<Partial<Record<string, TabLayout>>>({});
  const previousTabRef = useRef<ExploreHeaderTab>(selectedTab);
  const trackRef = useRef<View>(null);
  const tabRefs = useRef<Partial<Record<string, View>>>({});
  const labelRefs = useRef<Partial<Record<string, Text>>>({});
  const [underline, setUnderline] = useState<UnderlineLayout>({
    left: 0,
    width: 0,
    visible: false,
  });

  const scrollOffsetX = useSharedValue(0);
  const isUserDragging = useSharedValue(false);

  const onTabScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffsetX.value = event.contentOffset.x;
    },
    onBeginDrag: () => {
      isUserDragging.value = true;
    },
    onEndDrag: () => {
      isUserDragging.value = false;
    },
    onMomentumBegin: () => {
      isUserDragging.value = true;
    },
    onMomentumEnd: () => {
      isUserDragging.value = false;
    },
  });

  const moveUnderlineTo = useCallback((layout: TabLayout | undefined) => {
    if (!layout || layout.width <= 0) {
      setUnderline((prev) => ({ ...prev, visible: false }));
      return;
    }

    const width = UNDERLINE_WIDTH;
    const left = layout.x + (layout.width - width) / 2;

    setUnderline({
      left,
      width,
      visible: true,
    });
  }, []);

  const measureSelectedTab = useCallback(() => {
    const label = labelRefs.current[selectedTab];
    const track = trackRef.current;
    if (!label || !track) return;

    label.measureLayout(
      track,
      (x, _y, width) => {
        moveUnderlineTo({ x, width });
      },
      () => {
        requestAnimationFrame(() => measureSelectedTab());
      },
    );
  }, [moveUnderlineTo, selectedTab]);

  useEffect(() => {
    measureSelectedTab();
  }, [measureSelectedTab, selectedTab]);

  useAnimatedReaction(
    () => scrollOffsetX.value,
    (x, previous) => {
      if (isUserDragging.value) return;
      if (previous === null || x !== previous) {
        scrollTo(scrollRef, x, 0, false);
      }
    },
  );

  const getMaxScrollX = useCallback(() => {
    const viewport = scrollViewWidthRef.current;
    const content = contentWidthRef.current;
    if (viewport <= 0 || content <= 0) return 0;
    return Math.max(0, content - viewport);
  }, []);

  const clampScrollX = useCallback(
    (x: number) => {
      const maxX = getMaxScrollX();
      return Math.min(maxX, Math.max(0, x));
    },
    [getMaxScrollX],
  );

  const isScrollReady = useCallback(() => {
    return (
      scrollViewWidthRef.current > 0 &&
      contentWidthRef.current > scrollViewWidthRef.current
    );
  }, []);

  const computeScrollXForLayout = useCallback(
    (_tabIndex: number, layout: TabLayout) => {
      const viewport = scrollViewWidthRef.current;

      if (!isScrollReady()) return null;

      const tabCenter = layout.x + layout.width / 2;
      let target = tabCenter - viewport * TAB_ANCHOR_RATIO;
      target = clampScrollX(target);

      const tabStart = layout.x - TAB_EDGE_PADDING;
      const tabEnd = layout.x + layout.width + TAB_EDGE_PADDING;

      if (target > tabStart) {
        target = clampScrollX(tabStart);
      }

      if (target + viewport < tabEnd) {
        target = clampScrollX(tabEnd - viewport);
      }

      return target;
    },
    [clampScrollX, isScrollReady],
  );

  const cacheTabLayout = useCallback(
    (name: ExploreHeaderTab, scrollIfSelected = false) => {
      const tab = tabRefs.current[name];
      const track = trackRef.current;
      if (!tab || !track) return;

      tab.measureLayout(
        track,
        (x, _y, width) => {
          const layout = { x, width };
          tabLayoutsRef.current[name] = layout;

          if (!scrollIfSelected || name !== selectedTab) return;

          const targetX = computeScrollXForLayout(
            headerTabs.indexOf(name),
            layout,
          );
          if (targetX !== null) {
            scrollOffsetX.value = targetX;
          }
        },
        () => {},
      );
    },
    [computeScrollXForLayout, headerTabs, scrollOffsetX, selectedTab],
  );

  const scrollXForTab = useCallback(
    (name: ExploreHeaderTab) => {
      const tabIndex = headerTabs.indexOf(name);
      const layout = tabLayoutsRef.current[name];
      if (tabIndex < 0 || !layout || !isScrollReady()) return null;
      return computeScrollXForLayout(tabIndex, layout);
    },
    [computeScrollXForLayout, headerTabs, isScrollReady],
  );

  const progressiveScrollToTab = useCallback(
    (targetTab: ExploreHeaderTab, animate: boolean) => {
      if (!isScrollReady()) {
        requestAnimationFrame(() => progressiveScrollToTab(targetTab, animate));
        return;
      }

      const targetX = scrollXForTab(targetTab);
      if (targetX === null) {
        cacheTabLayout(targetTab);
        requestAnimationFrame(() => progressiveScrollToTab(targetTab, animate));
        return;
      }

      if (!animate) {
        scrollOffsetX.value = targetX;
        previousTabRef.current = targetTab;
        return;
      }

      if (Math.abs(targetX - scrollOffsetX.value) <= SCROLL_POSITION_EPSILON) {
        previousTabRef.current = targetTab;
        return;
      }

      // Premium-feel: do one continuous scroll animation to `targetX`.
      // Distance-based duration avoids the “robotic” short-step timing.
      const distance = Math.abs(targetX - scrollOffsetX.value);
      const duration = Math.min(
        PROGRESSIVE_MAX_SCROLL_MS,
        Math.max(
          PROGRESSIVE_MIN_SCROLL_MS,
          distance * PROGRESSIVE_DISTANCE_TO_MS,
        ),
      );

      scrollOffsetX.value = withTiming(targetX, {
        duration,
        easing: PROGRESSIVE_EASING,
      });

      previousTabRef.current = targetTab;
    },
    [cacheTabLayout, isScrollReady, scrollOffsetX, scrollXForTab],
  );

  useEffect(() => {
    progressiveScrollToTab(selectedTab, true);
    requestAnimationFrame(() => {
      cacheTabLayout(selectedTab, true);
    });
  }, [cacheTabLayout, progressiveScrollToTab, selectedTab]);

  const onTabPress = (name: ExploreHeaderTab) => {
    if (name === FOR_YOU_TAB) {
      if (discoveryMode === "forYou" && selectedRegion === null) return;
      void restoreForYouFeed();
      return;
    }

    if (name === HERE_TAB) {
      return;
    }

    if (!isContinent(name)) return;

    if (selectedRegion === name && discoveryMode === "region") {
      void setRegionFilter(null);
      return;
    }

    void setRegionFilter(name);
  };

  return (
    <View style={{ paddingTop: insets.top + 8 }}>
      <View style={styles.headerRow}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.continentsScroll}
          contentContainerStyle={styles.continentsRow}
          scrollEventThrottle={16}
          onScroll={onTabScroll}
          onLayout={(event) => {
            scrollViewWidthRef.current = event.nativeEvent.layout.width;
          }}
        >
          <View
            ref={trackRef}
            style={styles.continentsTrack}
            collapsable={false}
            onLayout={(event) => {
              contentWidthRef.current = event.nativeEvent.layout.width;
            }}
          >
            {headerTabs.map((name, index) => {
              const selected = name === selectedTab;
              const accessibilityLabel =
                name === FOR_YOU_TAB
                  ? "Show your personalized country feed"
                  : name === HERE_TAB
                    ? `Here mode: ${hereScopeLabel}, ${countryCount} countries`
                    : selected
                      ? `Clear ${name} filter and show For You feed`
                      : `Show countries in ${name}`;

              return (
                <View
                  key={name}
                  ref={(node) => {
                    if (node) {
                      tabRefs.current[name] = node;
                    } else {
                      delete tabRefs.current[name];
                    }
                  }}
                  style={[
                    styles.continentTab,
                    index > 0 ? styles.continentTabSpacing : undefined,
                  ]}
                  collapsable={false}
                  onLayout={() => {
                    cacheTabLayout(name, name === selectedTab);
                    if (selectedTab === name) {
                      measureSelectedTab();
                    }
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={accessibilityLabel}
                    onPress={() => onTabPress(name)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.continentItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      ref={(node) => {
                        if (node) {
                          labelRefs.current[name] = node;
                        } else {
                          delete labelRefs.current[name];
                        }
                      }}
                      className={
                        selected
                          ? "shrink-0 pb-0 text-[15px] leading-[15px] font-semibold text-white"
                          : hasActiveFilter
                            ? "shrink-0 pb-0 text-[15px] leading-[15px] font-normal text-white/40"
                            : "shrink-0 pb-0 text-[15px] leading-[15px] font-normal text-white/70"
                      }
                      style={styles.continentLabel}
                      onLayout={() => {
                        if (selectedTab === name) {
                          measureSelectedTab();
                        }
                      }}
                    >
                      {name === FOR_YOU_TAB
                        ? name
                        : name === HERE_TAB
                          ? name
                          : continentTabLabel(name, selected)}
                    </Text>
                  </Pressable>
                </View>
              );
            })}

            {underline.visible ? (
              <View
                style={[
                  styles.slidingUnderline,
                  { left: underline.left, width: underline.width },
                ]}
                pointerEvents="none"
              />
            ) : null}
          </View>
        </Animated.ScrollView>

        <View style={styles.searchDivider} accessibilityElementsHidden />

        <View style={styles.searchSlot}>
          <GlassIconButton
            icon="search-outline"
            label="Search"
            variant="plain"
            onPress={() => openSearch()}
            accessibilityLabel="Search countries"
            accessibilityHint="Opens country search"
          />
        </View>
      </View>

      {discoveryMode === "here" ? (
        <Text style={styles.hereSubtitle}>
          Here · {hereScopeLabel} · {countryCount} countries
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: HEADER_ROW_HEIGHT,
    paddingLeft: 16,
    paddingRight: 4,
  },
  continentsScroll: {
    flex: 1,
    height: HEADER_ROW_HEIGHT,
    marginRight: 4,
  },
  continentsRow: {
    alignItems: "center",
    minHeight: HEADER_ROW_HEIGHT,
  },
  continentsTrack: {
    flexDirection: "row",
    alignItems: "center",
    height: HEADER_ROW_HEIGHT,
    paddingHorizontal: TAB_EDGE_PADDING,
    position: "relative",
    paddingBottom: TAB_UNDERLINE_INSET,
  },
  continentTab: {
    flexShrink: 0,
    justifyContent: "center",
  },
  continentTabSpacing: {
    marginLeft: 4,
  },
  continentItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  continentLabel: {
    includeFontPadding: false,
  },
  slidingUnderline: {
    position: "absolute",
    bottom: 4,
    height: UNDERLINE_HEIGHT,
    borderRadius: 1,
    backgroundColor: "#ffffff",
  },
  searchDivider: {
    alignSelf: "center",
    width: StyleSheet.hairlineWidth,
    height: 20,
    marginRight: 0,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  searchSlot: {
    width: HEADER_ROW_HEIGHT,
    height: HEADER_ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  hereSubtitle: {
    marginTop: 2,
    paddingHorizontal: 16,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.55)",
  },
});
