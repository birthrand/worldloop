import { Pressable, StyleSheet, View } from "react-native";

import {
  EXPLORE_SWIPE_CAROUSEL_SEGMENT_ACTIVE,
  EXPLORE_SWIPE_CAROUSEL_SEGMENT_GAP,
  EXPLORE_SWIPE_CAROUSEL_SEGMENT_HEIGHT,
  EXPLORE_SWIPE_CAROUSEL_SEGMENT_INACTIVE,
  EXPLORE_SWIPE_CAROUSEL_SEGMENT_WIDTH,
} from "@/constants/explore-swipe-layout";

type MediaCarouselProps = {
  images: string[];
  activeIndex: number;
  onImageIndexChange: (index: number) => void;
  disabled?: boolean;
  /** `dots` = frosted pill; `segments` = SOMI-style flat progress bar. */
  variant?: "dots" | "segments";
};

export function MediaCarousel({
  images,
  activeIndex,
  onImageIndexChange,
  disabled = false,
  variant = "dots",
}: MediaCarouselProps) {
  const slideCount = Math.max(images.length, 1);

  if (slideCount <= 1) {
    return null;
  }

  if (variant === "segments") {
    return (
      <View
        style={[styles.segmentTrack, disabled && styles.segmentTrackDisabled]}
        pointerEvents={disabled ? "none" : "auto"}
      >
        {Array.from({ length: slideCount }, (_, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={`segment-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Show image ${index + 1} of ${slideCount}`}
              accessibilityState={{ selected: isActive, disabled }}
              onPress={() => onImageIndexChange(index)}
              disabled={disabled}
              style={styles.segmentPressable}
              hitSlop={8}
            >
              <View
                style={[
                  styles.segment,
                  isActive ? styles.segmentActive : styles.segmentInactive,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    );
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
  segmentTrack: {
    flexDirection: "row",
    alignItems: "center",
    width: EXPLORE_SWIPE_CAROUSEL_SEGMENT_WIDTH,
    gap: EXPLORE_SWIPE_CAROUSEL_SEGMENT_GAP,
  },
  segmentTrackDisabled: {
    opacity: 0.45,
  },
  segmentPressable: {
    flex: 1,
  },
  segment: {
    height: EXPLORE_SWIPE_CAROUSEL_SEGMENT_HEIGHT,
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: EXPLORE_SWIPE_CAROUSEL_SEGMENT_ACTIVE,
  },
  segmentInactive: {
    backgroundColor: EXPLORE_SWIPE_CAROUSEL_SEGMENT_INACTIVE,
  },
});
