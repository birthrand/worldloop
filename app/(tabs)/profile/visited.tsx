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
import { ProfileHeroBackdrop } from "@/components/profile/profile-hero-backdrop";
import {
  SavedCountriesList,
  type SavedCountriesLayout,
} from "@/components/saved/saved-countries-list";
import { SavedEmptyState } from "@/components/saved/saved-empty-state";
import { VisitedCountryCardMenu } from "@/components/visited/visited-country-card-menu";
import { VisitedSpaceHeader } from "@/components/visited/visited-space-header";
import { PROFILE_SCREEN_BG } from "@/constants/profile-theme";
import { useVisitedCountriesList } from "@/hooks/use-visited-countries-list";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

const TAB_BAR_CLEARANCE = -32;
const HERO_HEIGHT_RATIO = 0.4;

const EMPTY_MESSAGE =
  "No visited countries yet — explore the world and mark places you've been to.";

function renderVisitedCardMenu(country: Country) {
  return <VisitedCountryCardMenu country={country} />;
}

export default function ProfileVisitedScreen() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding =
    TAB_BAR_CONTENT_HEIGHT + insets.bottom + TAB_BAR_CLEARANCE;
  const [layout, setLayout] = useState<SavedCountriesLayout>("grid");
  const heroHeight = Dimensions.get("window").height * HERO_HEIGHT_RATIO;

  const visitedCountries = useVisitedCountriesList();
  const feedCountries = useCountryFeedStore((s) => s.countries);
  const feedStatus = useCountryFeedStore((s) => s.status);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);

  useEffect(() => {
    if (feedCountries.length === 0 && feedStatus === "idle") {
      void loadInitialFeed();
    }
  }, [feedCountries.length, feedStatus, loadInitialFeed]);

  const isEmpty = visitedCountries.length === 0;

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
            <VisitedSpaceHeader
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
              <SavedCountriesList
                countries={visitedCountries}
                layout={layout}
                scrollBottomPadding={scrollBottomPadding}
                detailOrigin="profile"
                renderCardMenu={renderVisitedCardMenu}
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
