import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  FlatList,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import {
  CountryImage,
  isCountryImageReady,
} from "@/components/explore/country-image";

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
  onActiveImageLoadChange?: (loaded: boolean) => void;
  scrollEnabled?: boolean;
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
  onActiveImageLoadChange,
  scrollEnabled = true,
}: HeroImagePagerProps) {
  const listRef = useRef<FlatList<string>>(null);
  const syncedIndexRef = useRef(activeIndex);
  const [loadedByIndex, setLoadedByIndex] = useState<Record<number, boolean>>(
    {},
  );
  const slides = images.length > 0 ? images : [""];
  const heroScrollGesture = useMemo(() => Gesture.Native(), []);

  const reportActiveLoadState = useCallback(
    (index: number, loadedMap: Record<number, boolean>) => {
      const uri = images[index];
      const loaded =
        loadedMap[index] ?? (uri ? isCountryImageReady(uri) : true);
      onActiveImageLoadChange?.(loaded);
    },
    [images, onActiveImageLoadChange],
  );

  const handleSlideLoadChange = useCallback(
    (index: number, loaded: boolean) => {
      setLoadedByIndex((prev) => {
        if (prev[index] === loaded) return prev;
        return { ...prev, [index]: loaded };
      });
    },
    [],
  );

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
    const initialLoaded: Record<number, boolean> = {};
    for (let index = 0; index < images.length; index += 1) {
      if (isCountryImageReady(images[index])) {
        initialLoaded[index] = true;
      }
    }
    setLoadedByIndex(initialLoaded);
    scrollToIndex(0, false);
  }, [images, scrollToIndex]);

  useEffect(() => {
    reportActiveLoadState(activeIndex, loadedByIndex);
  }, [activeIndex, loadedByIndex, reportActiveLoadState]);

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

  const list = (
    <FlatList
      ref={listRef}
      data={slides}
      keyExtractor={(uri, index) => `${uri}-${index}`}
      horizontal
      pagingEnabled
      scrollEnabled={scrollEnabled}
      bounces={scrollEnabled && slides.length > 1}
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
      renderItem={({ item, index }) => (
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
            showSkeleton
            onLoadStateChange={(loaded) => handleSlideLoadChange(index, loaded)}
          />
        </Pressable>
      )}
    />
  );

  if (!scrollEnabled) {
    return list;
  }

  return <GestureDetector gesture={heroScrollGesture}>{list}</GestureDetector>;
}
