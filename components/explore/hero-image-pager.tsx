import { useCallback, useEffect, useRef } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
} from "react-native";

import { CountryImage } from "@/components/explore/country-image";

type HeroImagePagerProps = {
  images: string[];
  flag: string;
  iso2?: string;
  heroWidth: number;
  heroHeight: number;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onImagePress?: () => void;
  onImagePressIn?: () => void;
};

export function HeroImagePager({
  images,
  flag,
  iso2,
  heroWidth,
  heroHeight,
  activeIndex,
  onIndexChange,
  onImagePress,
  onImagePressIn,
}: HeroImagePagerProps) {
  const listRef = useRef<FlatList<string>>(null);
  const syncedIndexRef = useRef(activeIndex);
  const slides = images.length > 0 ? images : [""];

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (index < 0 || index >= slides.length) return;
      listRef.current?.scrollToOffset({
        offset: index * heroWidth,
        animated,
      });
    },
    [heroWidth, slides.length],
  );

  useEffect(() => {
    syncedIndexRef.current = 0;
    scrollToIndex(0, false);
  }, [images, scrollToIndex]);

  useEffect(() => {
    if (activeIndex === syncedIndexRef.current) return;
    syncedIndexRef.current = activeIndex;
    scrollToIndex(activeIndex, true);
  }, [activeIndex, scrollToIndex]);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / heroWidth);
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    syncedIndexRef.current = clamped;
    if (clamped !== activeIndex) {
      onIndexChange(clamped);
    }
  };

  return (
    <FlatList
      ref={listRef}
      data={slides}
      keyExtractor={(uri, index) => `${uri}-${index}`}
      horizontal
      pagingEnabled
      bounces={slides.length > 1}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      scrollEventThrottle={16}
      style={{ width: heroWidth, height: heroHeight }}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      getItemLayout={(_, index) => ({
        length: heroWidth,
        offset: heroWidth * index,
        index,
      })}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open AI country explorer"
          accessibilityHint="Opens a detailed AI-powered country profile"
          onPress={onImagePress}
          onPressIn={onImagePressIn}
          disabled={!onImagePress}
          style={{ width: heroWidth, height: heroHeight }}
        >
          <CountryImage
            uri={item || undefined}
            flag={flag}
            iso2={iso2}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </Pressable>
      )}
    />
  );
}
