import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CountryOfTheDayCard } from "@/components/home/country-of-the-day-card";
import { FeedErrorBanner } from "@/components/home/feed-error-banner";
import { HomeSearchBar } from "@/components/home/home-search-bar";
import { HomeStatsRow } from "@/components/home/home-stats-row";
import { RecentlyViewedSection } from "@/components/home/recently-viewed-section";
import { TrendingCountriesSection } from "@/components/home/trending-countries-section";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";

export default function HomeScreen() {
  const countries = useCountryFeedStore((s) => s.countries);
  const status = useCountryFeedStore((s) => s.status);
  const error = useCountryFeedStore((s) => s.error);
  const loadInitialFeed = useCountryFeedStore((s) => s.loadInitialFeed);

  const recentlyViewed = useRecentlyViewedStore((s) => s.entries ?? []);
  const seedIfEmpty = useRecentlyViewedStore((s) => s.seedIfEmpty);

  useEffect(() => {
    if (countries.length === 0 && status === "idle") {
      void loadInitialFeed();
    }
  }, [countries.length, status, loadInitialFeed]);

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

  const isLoading = status === "loading" && countries.length === 0;
  const showError = status === "error" && countries.length === 0;

  const featuredCountry = countries[0];
  const trendingCountries = countries.slice(1, 5);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#121212" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 112,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* <HomeHeader /> */}
        <HomeSearchBar />

        {showError ? (
          <FeedErrorBanner
            message={error}
            onRetry={() => {
              void loadInitialFeed();
            }}
          />
        ) : null}

        <View className="gap-6">
          <CountryOfTheDayCard country={featuredCountry} loading={isLoading} />
          <TrendingCountriesSection
            countries={trendingCountries}
            loading={isLoading}
          />
          <HomeStatsRow />
          <RecentlyViewedSection entries={recentlyViewed} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
