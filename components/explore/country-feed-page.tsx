import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";

import {
  isCountryImageReady,
  prefetchCountryImage,
} from "@/components/explore/country-image";
import { ExploreCountryCard } from "@/components/explore/explore-country-card";
import { HeroImagePager } from "@/components/explore/hero-image-pager";
import { MediaCarousel } from "@/components/explore/media-carousel";
import {
  EXPLORE_FEED_BODY_BG,
  EXPLORE_FEED_BOTTOM_INSET,
  EXPLORE_FEED_SURFACE_RADIUS,
} from "@/constants/explore-feed-layout";
import { getAiFactByIndex, getCountryImages } from "@/lib/format-country";
import {
  openCountryAiExplorer,
  warmCountryAiExplorer,
} from "@/lib/open-country-ai-explorer";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import type { Country } from "@/types/country";

const DOTS_BOTTOM_INSET = 5;
const HERO_INSET_ANIMATION_MS = 220;

type CountryFeedPageProps = {
  country: Country;
  pageHeight: number;
  heroTopInset: number;
  isActive?: boolean;
  onActiveHeroIndexChange?: (index: number) => void;
};

export function CountryFeedPage({
  country,
  pageHeight,
  heroTopInset,
  isActive = false,
  onActiveHeroIndexChange,
}: CountryFeedPageProps) {
  const images = useMemo(() => getCountryImages(country), [country.name]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroLayout, setHeroLayout] = useState({ width: 0, height: 0 });
  const [isActiveHeroLoaded, setIsActiveHeroLoaded] = useState(false);
  const paddingTopAnim = useRef(new Animated.Value(heroTopInset)).current;

  useEffect(() => {
    Animated.timing(paddingTopAnim, {
      toValue: heroTopInset,
      duration: HERO_INSET_ANIMATION_MS,
      useNativeDriver: false,
    }).start();
  }, [heroTopInset, paddingTopAnim]);

  const heroSlides = useMemo(
    () => Array.from({ length: images.length }, (_, index) => `${index}`),
    [images.length],
  );

  useEffect(() => {
    setHeroIndex(0);
    setIsActiveHeroLoaded(isCountryImageReady(images[0]));
  }, [country.name, images]);

  useLayoutEffect(() => {
    if (!isActive) return;
    onActiveHeroIndexChange?.(heroIndex);
  }, [heroIndex, isActive, onActiveHeroIndexChange]);

  useEffect(() => {
    for (const imageUri of images) {
      void prefetchCountryImage(imageUri);
    }
  }, [images]);

  useEffect(() => {
    void prefetchCountryProfile(country.name);
  }, [country.name]);

  const onImageIndexChange = useCallback(
    (index: number) => {
      setHeroIndex(index);
      setIsActiveHeroLoaded(isCountryImageReady(images[index]));
    },
    [images],
  );

  const onActiveHeroLoadChange = useCallback((loaded: boolean) => {
    setIsActiveHeroLoaded((prev) => (prev === loaded ? prev : loaded));
  }, []);

  const warmAiExplorer = useCallback(() => {
    warmCountryAiExplorer(country);
  }, [country]);

  const openAiExplorer = useCallback(() => {
    openCountryAiExplorer(country);
  }, [country]);

  return (
    <Animated.View
      style={{
        height: pageHeight,
        width: "100%",
        backgroundColor: EXPLORE_FEED_BODY_BG,
      }}
    >
      <Animated.View
        style={[styles.pageContent, { paddingTop: paddingTopAnim }]}
      >
        <View style={styles.feedColumn}>
          <View style={styles.feedUnit}>
            <View style={styles.heroRegion}>
              <View
                style={styles.heroShell}
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
                    onActiveImageLoadChange={onActiveHeroLoadChange}
                  />
                ) : null}

                {images.length > 1 ? (
                  <View style={styles.dotsOverlay} pointerEvents="box-none">
                    <MediaCarousel
                      images={heroSlides}
                      activeIndex={heroIndex}
                      onImageIndexChange={onImageIndexChange}
                      disabled={!isActiveHeroLoaded}
                    />
                  </View>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.cardRegion,
                { paddingBottom: EXPLORE_FEED_BOTTOM_INSET },
              ]}
            >
              <ExploreCountryCard
                country={country}
                fact={getAiFactByIndex(country, heroIndex)}
                onPress={openAiExplorer}
                onPressIn={warmAiExplorer}
              />
            </View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    flex: 1,
  },
  feedColumn: {
    flex: 1,
  },
  feedUnit: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: EXPLORE_FEED_SURFACE_RADIUS,
    borderBottomRightRadius: EXPLORE_FEED_SURFACE_RADIUS,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
      },
      android: {
        elevation: 5,
      },
      default: {},
    }),
  },
  heroRegion: {
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
  heroShell: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    backgroundColor: EXPLORE_FEED_BODY_BG,
  },
  cardRegion: {
    flexShrink: 0,
    width: "100%",
  },
  dotsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: DOTS_BOTTOM_INSET,
    alignItems: "center",
  },
});
