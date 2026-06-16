import { openTravelMap } from "@/lib/open-travel-map";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { ProfileHeroBackdrop } from "@/components/profile/profile-hero-backdrop";
import { ProfileHeroHeader } from "@/components/profile/profile-hero-header";
import { ProfileNavRow } from "@/components/profile/profile-nav-row";
import {
  WORLDLOOP_HEADER_TOP_PADDING,
  WorldLoopHeader,
} from "@/components/worldloop-header";
import {
  CULTURE_CHROME_TITLE_SIZE,
  CULTURE_CHROME_TOUCH_SIZE,
} from "@/constants/culture-chrome";
import {
  PROFILE_HEADER_BOTTOM_GAP,
  PROFILE_HERO_SAFE_TOP_GAP,
  PROFILE_HERO_TOP_PADDING,
  PROFILE_SCREEN_BG,
} from "@/constants/profile-theme";
import { useHeaderBackButton } from "@/hooks/use-header-back-button";
import { useHistoryProfileRow } from "@/hooks/use-history-profile-row";
import { useProfileStats } from "@/hooks/use-profile-stats";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";

const HERO_HEIGHT_RATIO = 0.4;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const seedIfEmpty = useSavedCountriesStore((s) => s.seedIfEmpty);
  const enrichFromFeed = useSavedCountriesStore((s) => s.enrichFromFeed);
  const seedRecentIfEmpty = useRecentlyViewedStore((s) => s.seedIfEmpty);
  const feedCountries = useCountryFeedStore((s) => s.countries);
  const feedStatus = useCountryFeedStore((s) => s.status);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);

  const stats = useProfileStats();
  const historyRow = useHistoryProfileRow();
  const { visible: showBack, onBackPress } = useHeaderBackButton();
  const heroHeight = Dimensions.get("window").height * HERO_HEIGHT_RATIO;

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
    const finishHydration = useRecentlyViewedStore.persist.onFinishHydration(
      () => {
        seedRecentIfEmpty();
      },
    );
    if (useRecentlyViewedStore.persist.hasHydrated()) {
      seedRecentIfEmpty();
    }
    return finishHydration;
  }, [seedRecentIfEmpty]);

  useEffect(() => {
    if (feedCountries.length === 0 && feedStatus === "idle") {
      void loadInitialFeed();
    }
  }, [feedCountries.length, feedStatus, loadInitialFeed]);

  useEffect(() => {
    enrichFromFeed(feedCountries);
  }, [feedCountries, enrichFromFeed]);

  const scrollBottomPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;
  const heroTopInset = showBack
    ? PROFILE_HERO_TOP_PADDING
    : insets.top + PROFILE_HERO_SAFE_TOP_GAP;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { minHeight: heroHeight }]}>
          <ProfileHeroBackdrop height={heroHeight} />

          {showBack ? (
            <View
              style={{
                paddingTop: insets.top + WORLDLOOP_HEADER_TOP_PADDING,
                paddingBottom: PROFILE_HEADER_BOTTOM_GAP,
              }}
            >
              <WorldLoopHeader
                showBack
                onBackPress={onBackPress}
                backAccessibilityLabel="Go back"
                showMenu={false}
                showSearch={false}
                title=""
                inactiveColor="#ffffff"
                rowHeight={CULTURE_CHROME_TOUCH_SIZE}
                sideSlotWidth={CULTURE_CHROME_TOUCH_SIZE}
                brandFontSize={CULTURE_CHROME_TITLE_SIZE}
              />
            </View>
          ) : null}

          <ProfileHeroHeader
            stats={stats.inlineStats}
            topInset={heroTopInset}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.navRows}>
            <ProfileNavRow
              icon="time-outline"
              title="Recently viewed"
              subtitle={historyRow.subtitle}
              trailing="thumbnail"
              thumbnailUri={historyRow.thumbnailUri}
              onPress={() => router.push("/(tabs)/profile/history")}
            />
            <ProfileNavRow
              icon="globe-outline"
              title="Visited countries"
              subtitle="Places you've been to"
              trailing="flags"
              visitedCountries={stats.topVisitedCountries}
              totalVisited={stats.countriesExplored}
              onPress={() => router.push("/(tabs)/profile/visited")}
            />
            <ProfileNavRow
              icon="map-outline"
              title="Travel map"
              subtitle="See everywhere you've been"
              trailing="map"
              onPress={() => openTravelMap()}
            />
            <ProfileNavRow
              icon="settings-outline"
              title="Settings"
              subtitle="Manage your account and preferences"
              trailing="none"
              onPress={() => router.push("/(tabs)/profile/settings")}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PROFILE_SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  heroSection: {
    position: "relative",
    overflow: "hidden",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  navRows: {
    gap: 10,
  },
});
