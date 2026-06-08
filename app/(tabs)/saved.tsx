import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { SavedEmptyState } from "@/components/saved/saved-empty-state";
import { SavedPlanetDetail } from "@/components/saved/saved-planet-detail";
import { SavedSpaceBackground } from "@/components/saved/saved-space-background";
import { SavedSpaceHeader } from "@/components/saved/saved-space-header";
import { SavedSpaceLegend } from "@/components/saved/saved-space-legend";
import { SavedSpaceMap } from "@/components/saved/saved-space-map";
import { getRecentlySavedNames } from "@/lib/saved-space-layout";
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
  const categoryByName = useSavedCountriesStore((s) => s.categoryByName);
  const seedIfEmpty = useSavedCountriesStore((s) => s.seedIfEmpty);
  const enrichFromFeed = useSavedCountriesStore((s) => s.enrichFromFeed);

  const feedCountries = useCountryFeedStore((s) => s.countries);
  const feedStatus = useCountryFeedStore((s) => s.status);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const insets = useSafeAreaInsets();
  const mapChromeBottom = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

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

  const mapCountries = useMemo(
    () => sortBySavedAt(savedCountries, savedAtByName, "asc"),
    [savedCountries, savedAtByName],
  );

  const detailCountries = useMemo(
    () => sortBySavedAt(savedCountries, savedAtByName, "desc"),
    [savedCountries, savedAtByName],
  );

  const recentlySavedNames = useMemo(
    () => getRecentlySavedNames(mapCountries, savedAtByName),
    [mapCountries, savedAtByName],
  );

  const isEmpty = mapCountries.length === 0;
  const isMapView = !isEmpty && !selectedCountry;
  const selectedIndex = selectedCountry
    ? detailCountries.findIndex(
        (country) => country.name === selectedCountry.name,
      )
    : -1;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <SavedSpaceBackground />

      <View style={[styles.content, isMapView && styles.contentMap]}>
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
        ) : selectedCountry && selectedIndex >= 0 ? (
          <Animated.View
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(200)}
            style={styles.detailWrap}
          >
            <SavedPlanetDetail
              countries={detailCountries}
              selectedIndex={selectedIndex}
              categoryByName={categoryByName}
              recentlySavedNames={recentlySavedNames}
              onReturn={() => setSelectedCountry(null)}
              onSelectedIndexChange={(index) => {
                const nextCountry = detailCountries[index];
                if (nextCountry) setSelectedCountry(nextCountry);
              }}
            />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(200)}
            style={styles.mapWrap}
          >
            <SavedSpaceHeader />
            <SavedSpaceMap
              countries={mapCountries}
              categoryByName={categoryByName}
              savedAtByName={savedAtByName}
              onSelectCountry={setSelectedCountry}
            />
          </Animated.View>
        )}
      </View>

      {isMapView ? (
        <View
          pointerEvents="none"
          style={[styles.floatingLegend, { bottom: mapChromeBottom + 12 }]}
        >
          <SavedSpaceLegend variant="floating" />
        </View>
      ) : null}
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
  contentMap: {
    paddingBottom: 0,
  },
  mapWrap: {
    flex: 1,
    gap: 8,
    marginHorizontal: -24,
  },
  detailWrap: {
    flex: 1,
  },
  emptyWrap: {
    flex: 1,
    gap: 24,
    justifyContent: "center",
  },
  floatingLegend: {
    position: "absolute",
    left: 24,
    zIndex: 10,
  },
});
