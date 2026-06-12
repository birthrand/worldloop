import { Pressable, StyleSheet, View } from "react-native";

type MediaCarouselProps = {
  images: string[];
  activeIndex: number;
  onImageIndexChange: (index: number) => void;
  disabled?: boolean;
};

export function MediaCarousel({
  images,
  activeIndex,
  onImageIndexChange,
  disabled = false,
}: MediaCarouselProps) {
  const slideCount = Math.max(images.length, 1);

  if (slideCount <= 1) {
    return null;
  }

  return (
    <View
      style={[styles.pillTrack, disabled && styles.pillTrackDisabled]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {Array.from({ length: slideCount }, (_, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={`dot-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Show image ${index + 1} of ${slideCount}`}
            accessibilityState={{ selected: isActive, disabled }}
            onPress={() => onImageIndexChange(index)}
            disabled={disabled}
            hitSlop={8}
          >
            <View
              style={[
                styles.indicator,
                isActive ? styles.indicatorActive : styles.indicatorInactive,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pillTrack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.26)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  pillTrackDisabled: {
    opacity: 0.45,
  },
  indicator: {
    borderRadius: 999,
  },
  indicatorActive: {
    width: 18,
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
  },
  indicatorInactive: {
    width: 5,
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
});
