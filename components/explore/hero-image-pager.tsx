import { useCallback, useEffect, useRef } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { CountryImage } from "@/components/explore/country-image";

type HeroImagePagerProps = {
  images: string[];
  flag: string;
  iso2?: string;
  pageHeight: number;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onImagePress?: () => void;
};

export function HeroImagePager({
  images,
  flag,
  iso2,
  pageHeight,
  activeIndex,
  onIndexChange,
  onImagePress,
}: HeroImagePagerProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const syncedIndexRef = useRef(activeIndex);
  const slides = images.length > 0 ? images : [""];

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (index < 0 || index >= slides.length) return;
      listRef.current?.scrollToOffset({
        offset: index * width,
        animated,
      });
    },
    [slides.length, width],
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
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
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
      style={styles.list}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open AI country explorer"
          accessibilityHint="Opens a detailed AI-powered country profile"
          onPress={onImagePress}
          disabled={!onImagePress}
          style={{ width, height: pageHeight }}
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

const styles = StyleSheet.create({
  list: {
    ...StyleSheet.absoluteFillObject,
  },
});
