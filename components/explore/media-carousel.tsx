import { useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { CountryImage } from "@/components/explore/country-image";

const THUMB_SIZE = 72;
const THUMB_GAP = 8;

type MediaCarouselProps = {
  images: string[];
  flag: string;
  iso2?: string;
  onImageIndexChange: (index: number) => void;
};

export function MediaCarousel({
  images,
  flag,
  iso2,
  onImageIndexChange,
}: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const displayImages =
    images.length > 0 ? images : ([null] as (string | null)[]);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    onImageIndexChange(index);
    listRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (THUMB_SIZE + THUMB_GAP));
    if (index !== activeIndex && index >= 0 && index < displayImages.length) {
      setActiveIndex(index);
      onImageIndexChange(index);
    }
  };

  return (
    <View className="gap-3 -mb-4">
      <FlatList
        ref={listRef}
        data={displayImages as string[]}
        keyExtractor={(_, index) => `thumb-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={THUMB_SIZE + THUMB_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 8, gap: THUMB_GAP }}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({
          length: THUMB_SIZE + THUMB_GAP,
          offset: (THUMB_SIZE + THUMB_GAP) * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Image ${index + 1} of ${displayImages.length}`}
              accessibilityState={{ selected: isActive }}
              onPress={() => handleSelect(index)}
            >
              <CountryImage
                uri={item ?? undefined}
                flag={flag}
                iso2={iso2}
                style={[styles.thumb, isActive && styles.thumbActive]}
                contentFit="cover"
                flagSize={{ width: 40, height: 28 }}
              />
            </Pressable>
          );
        }}
      />

      <View className="flex-row items-center justify-center gap-2">
        {displayImages.map((_, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.dot,
              index === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbActive: {
    borderColor: "#ffffff",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#ffffff",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
});
