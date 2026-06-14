import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CountryDetailCollapsingHeader } from "@/components/ai-explorer/country-detail-collapsing-header";
import { CountryProfileCard } from "@/components/ai-explorer/country-profile-card";
import { getCountryDetailContentPaddingBottom } from "@/constants/country-detail-layout";
import { EXPLORE_SWIPE_SCREEN_BG } from "@/constants/explore-swipe-layout";
import { useAiExplorerCountry } from "@/hooks/use-ai-explorer-country";
import { getCachedCountryProfile } from "@/lib/country-profile-cache";
import { getCountryImages } from "@/lib/format-country";
import { focusCountryOnMap } from "@/lib/open-country-on-map";

/** Country detail — profile-style deep dive for a single country. */
export default function CountryDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const routeName =
    typeof name === "string" ? decodeURIComponent(name).trim() : "";
  const { country, refreshing, wikipedia, landmarks } = useAiExplorerCountry();
  const { height: screenHeight } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const overviewLoading = refreshing && !wikipedia?.extract?.trim();
  const images = getCountryImages(country);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleShowMap = useCallback(() => {
    const mapCountry =
      (routeName ? getCachedCountryProfile(routeName)?.country : null) ??
      country;
    focusCountryOnMap(mapCountry, "countryDetail");
    router.push("/(tabs)/map");
  }, [country, routeName]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <StatusBar style="light" />

      <CountryDetailCollapsingHeader
        country={country}
        countryName={country.name}
        scrollY={scrollY}
        screenHeight={screenHeight}
        onBack={handleBack}
      />

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getCountryDetailContentPaddingBottom(screenHeight) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        <CountryProfileCard
          country={country}
          images={images}
          wikipedia={wikipedia}
          landmarks={landmarks}
          overviewLoading={overviewLoading}
          scrollY={scrollY}
          onShowMap={handleShowMap}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: EXPLORE_SWIPE_SCREEN_BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: EXPLORE_SWIPE_SCREEN_BG,
  },
  scrollContent: {},
});
