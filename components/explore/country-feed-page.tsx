import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { prefetchCountryImage } from "@/components/explore/country-image";
import { ExploreCountryCard } from "@/components/explore/explore-country-card";
import { HeroImagePager } from "@/components/explore/hero-image-pager";
import { MediaCarousel } from "@/components/explore/media-carousel";
import { getAiFactByIndex, getCountryImages } from "@/lib/format-country";
import {
  openCountryAiExplorer,
  warmCountryAiExplorer,
} from "@/lib/open-country-ai-explorer";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import type { Country } from "@/types/country";

const HERO_HORIZONTAL_INSET = 8;
const HERO_BORDER_RADIUS = 12;
const DOTS_BOTTOM_INSET = 10;
/** Even vertical rhythm between hero and country card. */
const SECTION_GAP = 10;

type CountryFeedPageProps = {
  country: Country;
  pageHeight: number;
};

export function CountryFeedPage({ country, pageHeight }: CountryFeedPageProps) {
  const { width: screenWidth } = useWindowDimensions();
  const images = useMemo(() => getCountryImages(country), [country.name]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroLayout, setHeroLayout] = useState({ width: 0, height: 0 });

  const heroWidth = screenWidth - HERO_HORIZONTAL_INSET * 2;
  const heroSlides = useMemo(
    () => Array.from({ length: images.length }, (_, index) => `${index}`),
    [images.length],
  );

  useEffect(() => {
    setHeroIndex(0);
  }, [country.name]);

  useEffect(() => {
    for (const imageUri of images) {
      void prefetchCountryImage(imageUri);
    }
  }, [images]);

  useEffect(() => {
    void prefetchCountryProfile(country.name);
  }, [country.name]);

  const onImageIndexChange = useCallback((index: number) => {
    setHeroIndex(index);
  }, []);

  const warmAiExplorer = useCallback(() => {
    warmCountryAiExplorer(country);
  }, [country]);

  const openAiExplorer = useCallback(() => {
    openCountryAiExplorer(country);
  }, [country]);

  return (
    <View style={{ height: pageHeight, width: "100%" }}>
      <View style={styles.pageContent}>
        <View style={styles.heroRegion}>
          <View
            style={[
              styles.heroShell,
              {
                width: heroWidth,
                borderRadius: HERO_BORDER_RADIUS,
              },
            ]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              const next = {
                width: Math.round(width),
                height: Math.round(height),
              };
              if (
                next.width !== heroLayout.width ||
                next.height !== heroLayout.height
              ) {
                setHeroLayout(next);
              }
            }}
          >
            {heroLayout.width > 0 && heroLayout.height > 0 ? (
              <HeroImagePager
                images={images}
                flag={country.flag}
                iso2={country.cca2}
                heroWidth={heroLayout.width}
                heroHeight={heroLayout.height}
                activeIndex={heroIndex}
                onIndexChange={onImageIndexChange}
                onImagePress={openAiExplorer}
                onImagePressIn={warmAiExplorer}
              />
            ) : null}

            {images.length > 1 ? (
              <View style={styles.dotsOverlay} pointerEvents="box-none">
                <MediaCarousel
                  images={heroSlides}
                  activeIndex={heroIndex}
                  onImageIndexChange={onImageIndexChange}
                />
              </View>
            ) : null}
          </View>
        </View>

        <ExploreCountryCard
          country={country}
          fact={getAiFactByIndex(country, heroIndex)}
          onPress={openAiExplorer}
          onPressIn={warmAiExplorer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    flex: 1,
    gap: SECTION_GAP,
  },
  heroRegion: {
    flex: 1,
    alignItems: "center",
    minHeight: 0,
  },
  heroShell: {
    flex: 1,
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: "#0b132b",
  },
  dotsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: DOTS_BOTTOM_INSET,
    alignItems: "center",
  },
});
