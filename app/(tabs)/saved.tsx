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
import { SavedLandmarksList } from "@/components/saved/saved-landmarks-list";
import { SavedSpaceHeader } from "@/components/saved/saved-space-header";
import {
  SavedTypeTabs,
  type SavedContentTab,
} from "@/components/saved/saved-type-tabs";
import { EXPLORE_SWIPE_SCREEN_BG } from "@/constants/explore-swipe-layout";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

function sortCountriesBySavedAt(
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

function sortLandmarksBySavedAt(
  items: PlaceFeedItem[],
  savedAtById: Record<string, number>,
  direction: "asc" | "desc",
): PlaceFeedItem[] {
  return [...items].sort((a, b) => {
    const aTime = savedAtById[a.landmark.id] ?? 0;
    const bTime = savedAtById[b.landmark.id] ?? 0;
    return direction === "asc" ? aTime - bTime : bTime - aTime;
  });
}

const TAB_BAR_CLEARANCE = -32;

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding =
    TAB_BAR_CONTENT_HEIGHT + insets.bottom + TAB_BAR_CLEARANCE;
  const [activeTab, setActiveTab] = useState<SavedContentTab>("countries");
  const [layout, setLayout] = useState<SavedCountriesLayout>("grid");

  const savedCountries = useSavedCountriesStore((s) => s.savedCountries);
  const savedAtByName = useSavedCountriesStore((s) => s.savedAtByName);
  const seedIfEmpty = useSavedCountriesStore((s) => s.seedIfEmpty);
  const enrichCountriesFromFeed = useSavedCountriesStore(
    (s) => s.enrichFromFeed,
  );

  const savedLandmarks = useSavedLandmarksStore((s) => s.savedLandmarks);
  const savedAtById = useSavedLandmarksStore((s) => s.savedAtById);
  const enrichLandmarksFromFeed = useSavedLandmarksStore(
    (s) => s.enrichFromFeed,
  );

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
    enrichCountriesFromFeed(feedCountries);
    enrichLandmarksFromFeed(feedCountries);
  }, [feedCountries, enrichCountriesFromFeed, enrichLandmarksFromFeed]);

  const listCountries = useMemo(
    () => sortCountriesBySavedAt(savedCountries, savedAtByName, "desc"),
    [savedCountries, savedAtByName],
  );

  const listLandmarks = useMemo(
    () => sortLandmarksBySavedAt(savedLandmarks, savedAtById, "desc"),
    [savedLandmarks, savedAtById],
  );

  const isCountriesTab = activeTab === "countries";
  const activeItems = isCountriesTab ? listCountries : listLandmarks;
  const isEmpty = activeItems.length === 0;

  const emptyMessage = isCountriesTab
    ? "No saved countries yet — explore the world and tap Save on places you love."
    : "No saved landmarks yet — open Browse feed → Saved and bookmark places you love.";

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <ExploreSwipeWorldBackground />

      <View style={styles.content}>
        <View style={styles.headerBlock}>
          <SavedSpaceHeader
            layout={isEmpty ? undefined : layout}
            onLayoutChange={isEmpty ? undefined : setLayout}
          />
          <SavedTypeTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </View>

        {isEmpty ? (
          <Animated.View
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(200)}
            style={[styles.emptyWrap, { paddingBottom: scrollBottomPadding }]}
          >
            <SavedEmptyState
              message={emptyMessage}
              showExploreCta={isCountriesTab}
            />
          </Animated.View>
        ) : (
          <Animated.View
            key={activeTab}
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(200)}
            style={styles.listWrap}
          >
            {isCountriesTab ? (
              <SavedCountriesList
                countries={listCountries}
                layout={layout}
                scrollBottomPadding={scrollBottomPadding}
              />
            ) : (
              <SavedLandmarksList
                items={listLandmarks}
                layout={layout}
                scrollBottomPadding={scrollBottomPadding}
              />
            )}
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
  headerBlock: {
    gap: 12,
    marginBottom: 16,
  },
  listWrap: {
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
});
