import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { SavedCountriesList } from "@/components/saved/saved-countries-list";
import { SavedEmptyState } from "@/components/saved/saved-empty-state";
import { SavedSpaceBackground } from "@/components/saved/saved-space-background";
import { SavedSpaceHeader } from "@/components/saved/saved-space-header";
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

export default function SavedScreen() {
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
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <SavedSpaceBackground />

      <View style={styles.content}>
        {isEmpty ? (
          <Animated.View
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(200)}
            style={styles.emptyWrap}
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
            <SavedSpaceHeader />
            <SavedCountriesList countries={listCountries} />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b132b",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 112,
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
