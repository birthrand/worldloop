import { ExplorerBackButton } from "@/components/ai-explorer/explorer-back-button";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { images as appImages } from "@/constants/images";
import { Image } from "expo-image";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Share of screen height for the edge-to-edge hero. */
const HERO_HEIGHT_RATIO = 0.4;

type CountryHeroCarouselProps = {
  images: string[];
  countryName: string;
  onBack: () => void;
};

export function CountryHeroCarousel({
  images,
  countryName,
  onBack,
}: CountryHeroCarouselProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const heroHeight = Math.round(screenHeight * HERO_HEIGHT_RATIO);
  const fallbackWidth = screenWidth;

  const [carouselWidth, setCarouselWidth] = useState(fallbackWidth);
  const [activeIndex, setActiveIndex] = useState(0);
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

  const goToSlide = (index: number) => {
    if (index < 0 || index >= slides.length) return;
    setActiveIndex(index);
    listRef.current?.scrollToOffset({
      offset: index * carouselWidth,
      animated: true,
    });
  };

  const handleCarouselLayout = (width: number) => {
    if (width > 0 && Math.abs(width - carouselWidth) > 1) {
      setCarouselWidth(width);
    }
  };

  const backButtonTop = insets.top + 8;

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
        <View style={[styles.backOverlay, { top: backButtonTop }]}>
          <ExplorerBackButton onPress={onBack} />
        </View>
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

      <View style={[styles.backOverlay, { top: backButtonTop }]}>
        <ExplorerBackButton onPress={onBack} />
      </View>

      {slides.length > 1 ? (
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <Pressable
                key={`dot-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Go to image ${index + 1} of ${slides.length}`}
                accessibilityState={{ selected: isActive }}
                onPress={() => goToSlide(index)}
                hitSlop={8}
                style={styles.dotHitArea}
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
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    overflow: "hidden",
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  backOverlay: {
    position: "absolute",
    left: 16,
    zIndex: 3,
  },
  pagination: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    zIndex: 2,
  },
  dotHitArea: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AI_EXPLORER_THEME.accent,
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
});
