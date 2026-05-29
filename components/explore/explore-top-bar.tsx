import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  continentDisplayLabel,
  EXPLORE_HEADER_TABS,
  FOR_YOU_TAB,
  isContinent,
  type ExploreHeaderTab,
} from "@/constants/regions";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSearchUiStore } from "@/store/use-search-ui-store";

const UNDERLINE_WIDTH_RATIO = 0.55;
const UNDERLINE_MAX_WIDTH = 40;
const UNDERLINE_SPRING = { damping: 20, stiffness: 280 };
const PROGRESSIVE_EASING = Easing.out(Easing.cubic);
const PROGRESSIVE_MIN_SCROLL_MS = 250;
const PROGRESSIVE_MAX_SCROLL_MS = 550;
const PROGRESSIVE_DISTANCE_TO_MS = 0.6;
const SCROLL_POSITION_EPSILON = 2;
/** Place selected tab center at this fraction of the viewport width. */
const TAB_ANCHOR_RATIO = 0.5;

type TabLayout = { x: number; width: number };

export function ExploreTopBar() {
  const insets = useSafeAreaInsets();
  const openSearch = useSearchUiStore((s) => s.openSearch);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const setRegionFilter = useCountryFeedStore((s) => s.setRegionFilter);

  const selectedTab: ExploreHeaderTab =
    selectedRegion === null
      ? FOR_YOU_TAB
      : (selectedRegion as ExploreHeaderTab);
  const hasActiveFilter = selectedRegion !== null;

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollViewWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const tabLayoutsRef = useRef<Partial<Record<string, TabLayout>>>({});
  const previousTabRef = useRef<ExploreHeaderTab>(selectedTab);
  const trackRef = useRef<View>(null);
  const tabRefs = useRef<Partial<Record<string, View>>>({});
  const underlineVisibleRef = useRef(false);

  const scrollOffsetX = useSharedValue(0);

  const underlineX = useSharedValue(0);
  const underlineWidth = useSharedValue(0);
  const underlineOpacity = useSharedValue(0);

  const moveUnderlineTo = useCallback(
    (layout: TabLayout | undefined, animate: boolean) => {
      if (!layout) {
        underlineOpacity.value = withTiming(0, { duration: 180 });
        underlineVisibleRef.current = false;
        return;
      }

      const narrowWidth = Math.min(
        layout.width * UNDERLINE_WIDTH_RATIO,
        UNDERLINE_MAX_WIDTH,
      );
      const targetX = layout.x + (layout.width - narrowWidth) / 2;

      underlineOpacity.value = withTiming(1, { duration: 180 });
      underlineVisibleRef.current = true;

      if (animate) {
        underlineX.value = withSpring(targetX, UNDERLINE_SPRING);
        underlineWidth.value = withSpring(narrowWidth, UNDERLINE_SPRING);
      } else {
        underlineX.value = targetX;
        underlineWidth.value = narrowWidth;
      }
    },
    [underlineOpacity, underlineWidth, underlineX],
  );

  const measureSelectedTab = useCallback(
    (animate: boolean) => {
      const tab = tabRefs.current[selectedTab];
      const track = trackRef.current;
      if (!tab || !track) return;

      tab.measureLayout(
        track,
        (x, _y, width) => {
          moveUnderlineTo({ x, width }, animate);
        },
        () => {
          requestAnimationFrame(() => measureSelectedTab(animate));
        },
      );
    },
    [moveUnderlineTo, selectedTab],
  );

  useEffect(() => {
    measureSelectedTab(underlineVisibleRef.current);
  }, [measureSelectedTab, selectedTab]);

  useAnimatedReaction(
    () => scrollOffsetX.value,
    (x, previous) => {
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

      const target = tabCenter - viewport * TAB_ANCHOR_RATIO;

      return clampScrollX(target);
    },
    [clampScrollX, isScrollReady],
  );

  const cacheTabLayout = useCallback((name: ExploreHeaderTab) => {
    const tab = tabRefs.current[name];
    const track = trackRef.current;
    if (!tab || !track) return;

    tab.measureLayout(
      track,
      (x, _y, width) => {
        tabLayoutsRef.current[name] = { x, width };
      },
      () => {},
    );
  }, []);

  const scrollXForTab = useCallback(
    (name: ExploreHeaderTab) => {
      const tabIndex = EXPLORE_HEADER_TABS.indexOf(name);
      const layout = tabLayoutsRef.current[name];
      if (tabIndex < 0 || !layout || !isScrollReady()) return null;
      return computeScrollXForLayout(tabIndex, layout);
    },
    [computeScrollXForLayout, isScrollReady],
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
  }, [progressiveScrollToTab, selectedTab]);

  const onTabPress = (name: ExploreHeaderTab) => {
    if (name === FOR_YOU_TAB) {
      if (selectedRegion === null) return;
      void setRegionFilter(null);
      return;
    }

    if (!isContinent(name)) return;

    if (selectedRegion === name) {
      void setRegionFilter(null);
      return;
    }

    void setRegionFilter(name);
  };

  return (
    <View style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center px-4">
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={styles.continentsScroll}
          contentContainerStyle={styles.continentsRow}
          scrollEventThrottle={16}
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
            {EXPLORE_HEADER_TABS.map((name, index) => {
              const selected =
                name === FOR_YOU_TAB
                  ? selectedRegion === null
                  : selectedRegion === name;
              const accessibilityLabel =
                name === FOR_YOU_TAB
                  ? "Show your personalized country feed"
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
                  style={index > 0 ? styles.continentTabSpacing : undefined}
                  collapsable={false}
                  onLayout={() => {
                    cacheTabLayout(name);
                    if (selectedTab === name) {
                      measureSelectedTab(underlineVisibleRef.current);
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
                      style={[
                        styles.continentText,
                        selected
                          ? styles.continentTextSelected
                          : hasActiveFilter
                            ? styles.continentTextDimmed
                            : styles.continentTextDefault,
                      ]}
                    >
                      {name === FOR_YOU_TAB ? name : continentDisplayLabel(name)}
                    </Text>
                  </Pressable>
                </View>
              );
            })}

            {/* <Animated.View
              style={[styles.slidingUnderline, animatedUnderlineStyle]}
              pointerEvents="none"
            /> */}
          </View>
        </Animated.ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search countries"
          onPress={() => openSearch()}
          hitSlop={8}
          style={({ pressed }) => [
            styles.searchButton,
            pressed && styles.pressed,
          ]}
        >
          <View className="p-2 bg-white/10 rounded-full border border-white/10">
            <Ionicons name="search" size={24} color="#ffffff" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  continentsScroll: {
    flex: 1,
    marginRight: 12,
  },
  continentsRow: {
    alignItems: "center",
  },
  continentsTrack: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
    position: "relative",
    minHeight: 44,
    paddingBottom: 2,
  },
  continentTabSpacing: {
    marginLeft: 16,
  },
  continentItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  continentText: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    paddingBottom: 0,
  },
  continentTextDefault: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  continentTextDimmed: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  continentTextSelected: {
    color: "#ffffff",
    fontFamily: "Poppins-SemiBold",
  },
  slidingUnderline: {
    position: "absolute",
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#ffffff",
  },
  searchButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.85,
  },
});
