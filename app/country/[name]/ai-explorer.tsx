import { router } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BlurredGlobeBackground } from "@/components/ai-explorer/blurred-globe-background";
import { CountryProfileCard } from "@/components/ai-explorer/country-profile-card";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { useAiExplorerCountry } from "@/hooks/use-ai-explorer-country";
import { getCountryImages } from "@/lib/format-country";
import { focusCountryOnMap } from "@/lib/open-country-on-map";

/**
 * AI Country Explorer — profile-style deep dive for a single country.
 * Route: app/country/[name]/ai-explorer.tsx (stack modal, tab bar hidden).
 */
export default function AIContentExplorerScreen() {
  const { country, loading, refreshing, wikipedia, landmarks } =
    useAiExplorerCountry();
  const overviewLoading = refreshing && !wikipedia?.extract?.trim();
  const images = getCountryImages(country);
  const showPageLoader = loading && !country.name;

  const handleShowMap = useCallback(() => {
    focusCountryOnMap(country, "explore");
    router.push("/(tabs)/map");
  }, [country]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <BlurredGlobeBackground centerY={0.42} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {showPageLoader ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={AI_EXPLORER_THEME.primary} />
          </View>
        ) : (
          <CountryProfileCard
            country={country}
            images={images}
            wikipedia={wikipedia}
            landmarks={landmarks}
            overviewLoading={overviewLoading}
            onBack={() => router.back()}
            onShowMap={handleShowMap}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingWrap: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
  },
});
