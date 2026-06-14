import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { ExploreSwipeWorldBackground } from "@/components/explore/explore-swipe-world-background";
import {
  SavedCountriesList,
  type SavedCountriesLayout,
} from "@/components/saved/saved-countries-list";
import { SavedEmptyState } from "@/components/saved/saved-empty-state";
import { SavedSpaceHeader } from "@/components/saved/saved-space-header";
import { EXPLORE_SWIPE_SCREEN_BG } from "@/constants/explore-swipe-layout";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

function sortBySavedAt(
  countries: Country[],
  savedAtByName: Record<string, number>,
  direction: "asc" | "desc",
): Country[] {
  return [...countries].sort((a, b) => {
    const aTime = savedAtByName[a.name] ?? 0;
    const bTime = savedAtByName[b.name] ?? 0;
    return direction === "asc" ? aTime - bTime : bTime - aTime;
  });
}

const TAB_BAR_CLEARANCE = -32;

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding =
    TAB_BAR_CONTENT_HEIGHT + insets.bottom + TAB_BAR_CLEARANCE;
  const [layout, setLayout] = useState<SavedCountriesLayout>("grid");
  const savedCountries = useSavedCountriesStore((s) => s.savedCountries);
  const savedAtByName = useSavedCountriesStore((s) => s.savedAtByName);
  const seedIfEmpty = useSavedCountriesStore((s) => s.seedIfEmpty);
  const enrichFromFeed = useSavedCountriesStore((s) => s.enrichFromFeed);

  const feedCountries = useCountryFeedStore((s) => s.countries);
  const feedStatus = useCountryFeedStore((s) => s.status);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);

  useEffect(() => {
    const finishHydration = useSavedCountriesStore.persist.onFinishHydration(
      () => {
        seedIfEmpty();
      },
    );
    if (useSavedCountriesStore.persist.hasHydrated()) {
      seedIfEmpty();
    }
    return finishHydration;
  }, [seedIfEmpty]);

  useEffect(() => {
    if (feedCountries.length === 0 && feedStatus === "idle") {
      void loadInitialFeed();
    }
  }, [feedCountries.length, feedStatus, loadInitialFeed]);

  useEffect(() => {
    enrichFromFeed(feedCountries);
  }, [feedCountries, enrichFromFeed]);

  const listCountries = useMemo(
    () => sortBySavedAt(savedCountries, savedAtByName, "desc"),
    [savedCountries, savedAtByName],
  );

  const isEmpty = listCountries.length === 0;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <ExploreSwipeWorldBackground />

      <View style={styles.content}>
        {isEmpty ? (
          <Animated.View
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(200)}
            style={[styles.emptyWrap, { paddingBottom: scrollBottomPadding }]}
          >
            <SavedSpaceHeader />
            <SavedEmptyState
              message="No saved countries yet — explore the world and tap Save on places you love."
              showExploreCta
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(200)}
            style={styles.listWrap}
          >
            <SavedSpaceHeader layout={layout} onLayoutChange={setLayout} />
            <SavedCountriesList
              countries={listCountries}
              layout={layout}
              scrollBottomPadding={scrollBottomPadding}
            />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: EXPLORE_SWIPE_SCREEN_BG,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  listWrap: {
    flex: 1,
    gap: 16,
  },
  emptyWrap: {
    flex: 1,
    gap: 24,
    justifyContent: "center",
  },
});
