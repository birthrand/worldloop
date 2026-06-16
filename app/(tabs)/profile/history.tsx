import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { HistoryList } from "@/components/history/history-list";
import { HistorySpaceHeader } from "@/components/history/history-space-header";
import { ProfileHeroBackdrop } from "@/components/profile/profile-hero-backdrop";
import type { SavedCountriesLayout } from "@/components/saved/saved-countries-list";
import { SavedEmptyState } from "@/components/saved/saved-empty-state";
import { PROFILE_SCREEN_BG } from "@/constants/profile-theme";
import { useRecentHistoryList } from "@/hooks/use-recent-history-list";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";

const TAB_BAR_CLEARANCE = -32;
const HERO_HEIGHT_RATIO = 0.4;

const EMPTY_MESSAGE =
  "Nothing recently viewed yet — explore countries and landmarks and they'll show up here.";

export default function ProfileHistoryScreen() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding =
    TAB_BAR_CONTENT_HEIGHT + insets.bottom + TAB_BAR_CLEARANCE;
  const [layout, setLayout] = useState<SavedCountriesLayout>("grid");
  const heroHeight = Dimensions.get("window").height * HERO_HEIGHT_RATIO;

  const historyEntries = useRecentHistoryList();
  const seedIfEmpty = useRecentlyViewedStore((s) => s.seedIfEmpty);
  const feedCountries = useCountryFeedStore((s) => s.countries);
  const feedStatus = useCountryFeedStore((s) => s.status);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);

  useEffect(() => {
    const finishHydration = useRecentlyViewedStore.persist.onFinishHydration(
      () => {
        seedIfEmpty();
      },
    );
    if (useRecentlyViewedStore.persist.hasHydrated()) {
      seedIfEmpty();
    }
    return finishHydration;
  }, [seedIfEmpty]);

  useEffect(() => {
    if (feedCountries.length === 0 && feedStatus === "idle") {
      void loadInitialFeed();
    }
  }, [feedCountries.length, feedStatus, loadInitialFeed]);

  const isEmpty = historyEntries.length === 0;

  const handleBackToProfile = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ProfileHeroBackdrop height={heroHeight} />
      <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
        <View style={styles.content}>
          <View style={styles.headerBlock}>
            <HistorySpaceHeader
              onReturn={handleBackToProfile}
              layout={isEmpty ? undefined : layout}
              onLayoutChange={isEmpty ? undefined : setLayout}
            />
          </View>

          {isEmpty ? (
            <Animated.View
              entering={FadeIn.duration(320)}
              exiting={FadeOut.duration(200)}
              style={[styles.emptyWrap, { paddingBottom: scrollBottomPadding }]}
            >
              <SavedEmptyState message={EMPTY_MESSAGE} showExploreCta />
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(320)}
              exiting={FadeOut.duration(200)}
              style={styles.listWrap}
            >
              <HistoryList
                entries={historyEntries}
                layout={layout}
                scrollBottomPadding={scrollBottomPadding}
              />
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PROFILE_SCREEN_BG,
  },
  screen: {
    flex: 1,
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
