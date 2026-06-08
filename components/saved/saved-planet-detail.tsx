import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { FlagBadge } from "@/components/explore/flag-badge";
import { SavedPlanetSphere } from "@/components/saved/saved-planet-sphere";
import { SavedSpaceHeader } from "@/components/saved/saved-space-header";
import { SavedSpaceLegend } from "@/components/saved/saved-space-legend";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import { getSavedCountryDescription } from "@/lib/saved-country-copy";
import { getPlanetPalette } from "@/lib/saved-space-layout";
import type { SavedCategory } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

type SavedPlanetDetailProps = {
  countries: Country[];
  selectedIndex: number;
  categoryByName: Record<string, SavedCategory>;
  recentlySavedNames: Set<string>;
  onReturn: () => void;
  onSelectedIndexChange: (index: number) => void;
};

type SavedPlanetDetailPageProps = {
  country: Country;
  category?: SavedCategory;
  isRecentlySaved: boolean;
};

function SavedPlanetDetailPage({
  country,
  category,
  isRecentlySaved,
}: SavedPlanetDetailPageProps) {
  const palette = getPlanetPalette(category, isRecentlySaved);
  const description = getSavedCountryDescription(country, 420);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.heroBlock}>
        <SavedPlanetSphere
          size={248}
          palette={palette}
          flag={country.flag}
          iso2={country.cca2}
        />

        <View style={styles.titleRow}>
          <FlagBadge
            flag={country.flag}
            iso2={country.cca2}
            width={22}
            height={15}
          />
          <Text className="font-semibold text-lg text-white">
            {country.name}
          </Text>
        </View>
      </View>

      <Text className="body-sm text-center leading-6 text-white/80">
        {description}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Explore ${country.name}`}
        onPress={() => openCountryInExplore(country)}
        style={({ pressed }) => [
          styles.exploreButton,
          pressed && styles.pressed,
        ]}
      >
        <Text className="font-semibold text-sm text-midnight-navy">
          Explore in feed
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export function SavedPlanetDetail({
  countries,
  selectedIndex,
  categoryByName,
  recentlySavedNames,
  onReturn,
  onSelectedIndexChange,
}: SavedPlanetDetailProps) {
  const [pageWidth, setPageWidth] = useState(0);
  const listRef = useRef<FlatList<Country>>(null);
  const skipProgrammaticScrollRef = useRef(false);
  const hasSyncedInitialScrollRef = useRef(false);

  const safeIndex = Math.max(
    0,
    Math.min(selectedIndex, Math.max(countries.length - 1, 0)),
  );

  const handlePagerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== pageWidth) {
      setPageWidth(width);
    }
  };

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (pageWidth <= 0 || countries.length === 0) return;
      listRef.current?.scrollToIndex({ index, animated });
    },
    [countries.length, pageWidth],
  );

  useEffect(() => {
    if (pageWidth <= 0 || countries.length === 0) return;

    if (skipProgrammaticScrollRef.current) {
      skipProgrammaticScrollRef.current = false;
      return;
    }

    const animated = hasSyncedInitialScrollRef.current;
    hasSyncedInitialScrollRef.current = true;
    scrollToIndex(safeIndex, animated);
  }, [countries.length, pageWidth, safeIndex, scrollToIndex]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextIndex = viewableItems[0]?.index;
      if (nextIndex == null || nextIndex === safeIndex) return;

      skipProgrammaticScrollRef.current = true;
      onSelectedIndexChange(nextIndex);
    },
    [onSelectedIndexChange, safeIndex],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const renderItem = useCallback(
    ({ item }: { item: Country }) => (
      <View style={[styles.page, { width: pageWidth }]}>
        <SavedPlanetDetailPage
          country={item}
          category={categoryByName[item.name]}
          isRecentlySaved={recentlySavedNames.has(item.name)}
        />
      </View>
    ),
    [categoryByName, pageWidth, recentlySavedNames],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Country> | null | undefined, index: number) => ({
      length: pageWidth,
      offset: pageWidth * index,
      index,
    }),
    [pageWidth],
  );

  return (
    <View style={styles.root}>
      <SavedSpaceHeader showReturn onReturn={onReturn} />

      <Animated.View
        entering={FadeInDown.duration(320)}
        style={styles.legendWrap}
      >
        <SavedSpaceLegend />
      </Animated.View>

      {countries.length > 1 ? (
        <Text
          className="text-center text-[11px] text-white/45"
          accessibilityLabel={`Saved country ${safeIndex + 1} of ${countries.length}`}
        >
          Swipe to browse · {safeIndex + 1} / {countries.length}
        </Text>
      ) : null}

      <View style={styles.pager} onLayout={handlePagerLayout}>
        {countries.length === 1 ? (
          <SavedPlanetDetailPage
            country={countries[0]}
            category={categoryByName[countries[0].name]}
            isRecentlySaved={recentlySavedNames.has(countries[0].name)}
          />
        ) : pageWidth > 0 ? (
          <FlatList
            ref={listRef}
            data={countries}
            horizontal
            pagingEnabled
            bounces
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.name}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialScrollIndex={safeIndex}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            style={styles.pagerList}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 12,
  },
  legendWrap: {
    paddingTop: 4,
  },
  pager: {
    flex: 1,
  },
  pagerList: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    overflow: "visible",
  },
  scrollContent: {
    alignItems: "center",
    gap: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  heroBlock: {
    alignItems: "center",
    gap: 16,
    width: "100%",
    overflow: "visible",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -2,
  },
  exploreButton: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.88,
  },
});
