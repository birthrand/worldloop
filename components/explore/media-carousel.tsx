import { Pressable, StyleSheet, View } from "react-native";

type MediaCarouselProps = {
  images: string[];
  activeIndex: number;
  onImageIndexChange: (index: number) => void;
};

export function MediaCarousel({
  images,
  activeIndex,
  onImageIndexChange,
}: MediaCarouselProps) {
  const slideCount = Math.max(images.length, 1);

  if (slideCount <= 1) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: slideCount }, (_, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={`dot-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Show image ${index + 1} of ${slideCount}`}
            accessibilityState={{ selected: isActive }}
            onPress={() => onImageIndexChange(index)}
            hitSlop={8}
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
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#fbbf24",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
});
