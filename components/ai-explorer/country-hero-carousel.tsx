import { CountryHeroScrimStack } from "@/components/ai-explorer/country-hero-scrims";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import {
  getCountryDetailHeroDotsBottom,
  getCountryDetailHeroHeight,
} from "@/constants/country-detail-layout";
import { images as appImages } from "@/constants/images";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

type CountryHeroCarouselProps = {
  images: string[];
  countryName: string;
  initialIndex?: number;
};

export function CountryHeroCarousel({
  images,
  countryName,
  initialIndex = 0,
}: CountryHeroCarouselProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const heroHeight = getCountryDetailHeroHeight(screenHeight);
  const dotsBottom = getCountryDetailHeroDotsBottom(screenHeight);
  const fallbackWidth = screenWidth;

  const [carouselWidth, setCarouselWidth] = useState(fallbackWidth);
  const lockedInitialIndex = useRef(initialIndex);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      Math.min(lockedInitialIndex.current, Math.max(images.length - 1, 0)),
    ),
  );
  const listRef = useRef<FlatList<string>>(null);

  const slides = images.length > 0 ? images : [];

  const updateIndexFromOffset = useCallback(
    (offsetX: number) => {
      if (carouselWidth <= 0 || slides.length === 0) return;
      const index = Math.round(offsetX / carouselWidth);
      const clamped = Math.max(0, Math.min(index, slides.length - 1));
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));
    },
    [carouselWidth, slides.length],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateIndexFromOffset(event.nativeEvent.contentOffset.x);
  };

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    updateIndexFromOffset(event.nativeEvent.contentOffset.x);
  };

  const handleCarouselLayout = (width: number) => {
    if (width > 0 && Math.abs(width - carouselWidth) > 1) {
      setCarouselWidth(width);
    }
  };

  useEffect(() => {
    if (carouselWidth <= 0 || slides.length === 0) return;

    const clamped = Math.max(
      0,
      Math.min(lockedInitialIndex.current, slides.length - 1),
    );
    listRef.current?.scrollToOffset({
      offset: clamped * carouselWidth,
      animated: false,
    });
    setActiveIndex(clamped);
  }, [carouselWidth, slides.length]);

  if (slides.length === 0) {
    return (
      <View
        style={[styles.heroWrap, { width: fallbackWidth, height: heroHeight }]}
        onLayout={(event) =>
          handleCarouselLayout(event.nativeEvent.layout.width)
        }
      >
        <View style={styles.placeholder}>
          <Image
            source={appImages.earthTopography}
            style={styles.placeholderImage}
            contentFit="cover"
            accessibilityLabel={`${countryName} placeholder`}
          />
        </View>
        <CountryHeroScrimStack containerHeight={heroHeight} />
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { width: carouselWidth, height: heroHeight }]}
      onLayout={(event) => handleCarouselLayout(event.nativeEvent.layout.width)}
    >
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(uri, index) => `${uri}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={[styles.list, { width: carouselWidth, height: heroHeight }]}
        getItemLayout={(_, index) => ({
          length: carouselWidth,
          offset: carouselWidth * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <View
            style={[styles.slide, { width: carouselWidth, height: heroHeight }]}
          >
            <Image
              source={{ uri: item }}
              style={styles.heroImage}
              contentFit="cover"
              accessibilityLabel={`${countryName} photo ${index + 1} of ${slides.length}`}
            />
          </View>
        )}
      />

      <CountryHeroScrimStack containerHeight={heroHeight} />

      {slides.length > 1 ? (
        <View
          style={[styles.paginationDots, { bottom: dotsBottom }]}
          accessibilityLabel={`Image ${activeIndex + 1} of ${slides.length}`}
        >
          {slides.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <Pressable
                key={`hero-dot-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Show image ${index + 1} of ${slides.length}`}
                accessibilityState={{ selected: isActive }}
                hitSlop={8}
                onPress={() => {
                  listRef.current?.scrollToIndex({ index, animated: true });
                  setActiveIndex(index);
                }}
              >
                <View
                  style={[
                    styles.dot,
                    isActive ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  list: {},
  heroWrap: {
    width: "100%",
  },
  slide: {},
  heroImage: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    overflow: "hidden",
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  paginationDots: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: AI_EXPLORER_THEME.accent,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
});
