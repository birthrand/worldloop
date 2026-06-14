import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { CountryDetailCollapsingHeader } from "@/components/ai-explorer/country-detail-collapsing-header";
import { CountryProfileCard } from "@/components/ai-explorer/country-profile-card";
import type { HeroMediaMode } from "@/components/explore/explore-swipe-card";
import { getCountryDetailContentPaddingBottom } from "@/constants/country-detail-layout";
import { EXPLORE_SWIPE_SCREEN_BG } from "@/constants/explore-swipe-layout";
import { useAiExplorerCountry } from "@/hooks/use-ai-explorer-country";
import type { CountryLandmark, CountryWikipediaSummary } from "@/lib/api";
import { getCachedCountryProfile } from "@/lib/country-profile-cache";
import { getCountryImages } from "@/lib/format-country";
import { focusCountryOnMap } from "@/lib/open-country-on-map";
import type { Country } from "@/types/country";

function parseHeroIndex(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 0;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseHeroMediaMode(
  value: string | string[] | undefined,
): HeroMediaMode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "video" ? "video" : "image";
}

type CountryDetailScreenBodyProps = {
  country: Country;
  images: string[];
  wikipedia: CountryWikipediaSummary | null;
  landmarks: CountryLandmark[];
  overviewLoading: boolean;
  initialHeroIndex: number;
  initialHeroMediaMode: HeroMediaMode;
  screenHeight: number;
  scrollY: SharedValue<number>;
  onBack: () => void;
  onShowMap: () => void;
};

function CountryDetailScreenBody({
  country,
  images,
  wikipedia,
  landmarks,
  overviewLoading,
  initialHeroIndex,
  initialHeroMediaMode,
  screenHeight,
  scrollY,
  onBack,
  onShowMap,
}: CountryDetailScreenBodyProps) {
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <>
      <CountryDetailCollapsingHeader
        country={country}
        countryName={country.name}
        scrollY={scrollY}
        screenHeight={screenHeight}
        onBack={onBack}
      />

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: getCountryDetailContentPaddingBottom(screenHeight),
          },
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
          onShowMap={onShowMap}
          initialHeroIndex={initialHeroIndex}
          initialHeroMediaMode={initialHeroMediaMode}
        />
      </Animated.ScrollView>
    </>
  );
}

/** Country detail — profile-style deep dive for a single country. */
export default function CountryDetailScreen() {
  const {
    name,
    heroIndex: heroIndexParam,
    heroMediaMode: heroMediaModeParam,
  } = useLocalSearchParams<{
    name: string;
    heroIndex?: string;
    heroMediaMode?: string;
  }>();
  const routeName =
    typeof name === "string" ? decodeURIComponent(name).trim() : "";
  const { country, refreshing, wikipedia, landmarks } = useAiExplorerCountry();
  const { height: screenHeight } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const [initialHeroIndex] = useState(() => parseHeroIndex(heroIndexParam));
  const [initialHeroMediaMode] = useState(() =>
    parseHeroMediaMode(heroMediaModeParam),
  );

  const overviewLoading = refreshing && !wikipedia?.extract?.trim();
  const images = getCountryImages(country);

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

      <CountryDetailScreenBody
        country={country}
        images={images}
        wikipedia={wikipedia}
        landmarks={landmarks}
        overviewLoading={overviewLoading}
        initialHeroIndex={initialHeroIndex}
        initialHeroMediaMode={initialHeroMediaMode}
        screenHeight={screenHeight}
        scrollY={scrollY}
        onBack={handleBack}
        onShowMap={handleShowMap}
      />
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
