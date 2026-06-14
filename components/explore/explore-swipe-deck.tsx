import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from "react-native-reanimated";

import { ExploreRegionCompleteState } from "@/components/explore/explore-region-complete-state";
import { ExploreSwipeCard } from "@/components/explore/explore-swipe-card";
import { ExploreSwipePlaceCard } from "@/components/explore/explore-swipe-place-card";
import {
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_RADIUS,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_DISMISS_THRESHOLD,
  EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
  EXPLORE_SWIPE_MAX_ROTATION,
  EXPLORE_SWIPE_STACK_OFFSET_Y,
  EXPLORE_SWIPE_STACK_SCALE_STEP,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_HEADER,
  EXPLORE_SWIPE_VELOCITY_THRESHOLD,
} from "@/constants/explore-swipe-layout";
import { isContinent } from "@/constants/regions";
import {
  prefetchFeedHeroImagesAroundIndex,
  warmFeedHeroesOnSwipeBegin,
} from "@/lib/prefetch-feed-heroes";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

const RETURN_SPRING: WithSpringConfig = {
  damping: 24,
  stiffness: 220,
  mass: 0.85,
};

const DISMISS_EASING = Easing.out(Easing.cubic);

function rubberBandOffset(value: number, factor = 0.3): number {
  "worklet";
  return value * factor;
}

function dismissDuration(distance: number, velocity: number): number {
  "worklet";
  const remaining = Math.max(0, distance);
  const speed = Math.max(Math.abs(velocity), 640);
  return Math.min(320, Math.max(180, (remaining / speed) * 1000));
}

type SwipeableTopCardProps = {
  country: Country;
  nextCountry?: Country;
  previousCountry?: Country;
  cardWidth: number;
  cardHeight: number;
  canGoBack: boolean;
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
  onSwipeBegin: () => void;
};

function SwipeableTopCard({
  country,
  nextCountry,
  previousCountry,
  cardWidth,
  cardHeight,
  canGoBack,
  onSwipeNext,
  onSwipePrevious,
  onSwipeBegin,
}: SwipeableTopCardProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const canSwipeBackSv = useSharedValue(canGoBack ? 1 : 0);
  const hasNextSv = useSharedValue(nextCountry ? 1 : 0);
  const [heroIndex, setHeroIndex] = useState(0);

  const canSwipeBack = canGoBack && heroIndex === 0;

  useEffect(() => {
    setHeroIndex(0);
  }, [country.name]);

  useEffect(() => {
    canSwipeBackSv.value = canSwipeBack ? 1 : 0;
  }, [canSwipeBack, canSwipeBackSv]);

  useEffect(() => {
    hasNextSv.value = nextCountry ? 1 : 0;
  }, [hasNextSv, nextCountry]);

  const triggerSwipeHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const completeSwipeNext = useCallback(() => {
    onSwipeNext();
  }, [onSwipeNext]);

  const completeSwipePrevious = useCallback(() => {
    onSwipePrevious();
  }, [onSwipePrevious]);

  const pan = Gesture.Pan()
    .activeOffsetY([
      -EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
      EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
    ])
    .failOffsetX([
      -EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
      EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
    ])
    .onBegin(() => {
      if (isDismissing.value) return;
      runOnJS(onSwipeBegin)();
    })
    .onUpdate((event) => {
      if (isDismissing.value) return;

      let y = event.translationY;

      if (y > 0 && canSwipeBackSv.value === 0) {
        y = rubberBandOffset(y);
      } else if (y < 0 && hasNextSv.value === 0) {
        y = rubberBandOffset(y);
      }

      translateY.value = y;
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (isDismissing.value) return;

      const y = translateY.value;
      const threshold = cardHeight * EXPLORE_SWIPE_DISMISS_THRESHOLD;
      const shouldDismiss =
        Math.abs(y) > threshold ||
        Math.abs(event.velocityY) > EXPLORE_SWIPE_VELOCITY_THRESHOLD;

      if (!shouldDismiss) {
        translateY.value = withSpring(0, RETURN_SPRING);
        translateX.value = withSpring(0, RETURN_SPRING);
        return;
      }

      const goingUp = y + event.velocityY * 0.08 < 0;

      if (goingUp) {
        if (hasNextSv.value === 0) {
          translateY.value = withSpring(0, RETURN_SPRING);
          translateX.value = withSpring(0, RETURN_SPRING);
          return;
        }

        isDismissing.value = true;
        runOnJS(triggerSwipeHaptic)();

        const target = -cardHeight * 1.45;
        const duration = dismissDuration(Math.abs(target - y), event.velocityY);

        translateY.value = withTiming(
          target,
          { duration, easing: DISMISS_EASING },
          (finished) => {
            if (finished) {
              runOnJS(completeSwipeNext)();
            }
          },
        );
        translateX.value = withTiming(translateX.value * 1.55, {
          duration,
          easing: DISMISS_EASING,
        });
        return;
      }

      if (canSwipeBackSv.value === 0) {
        translateY.value = withSpring(0, RETURN_SPRING);
        translateX.value = withSpring(0, RETURN_SPRING);
        return;
      }

      isDismissing.value = true;
      runOnJS(triggerSwipeHaptic)();

      const target = cardHeight * 1.45;
      const duration = dismissDuration(Math.abs(target - y), event.velocityY);

      translateY.value = withTiming(
        target,
        { duration, easing: DISMISS_EASING },
        (finished) => {
          if (finished) {
            runOnJS(completeSwipePrevious)();
          }
        },
      );
      translateX.value = withTiming(translateX.value * 1.55, {
        duration,
        easing: DISMISS_EASING,
      });
    });

  const nextStackAnimatedStyle = useAnimatedStyle(() => {
    const restingScale = 1 - EXPLORE_SWIPE_STACK_SCALE_STEP;

    if (translateY.value >= 0) {
      return {
        opacity: 1,
        transform: [
          { translateY: EXPLORE_SWIPE_STACK_OFFSET_Y },
          { scale: restingScale },
        ],
      };
    }

    const dragProgress = Math.min(
      Math.abs(translateY.value) / (cardHeight * 0.42),
      1,
    );

    return {
      opacity: 1,
      transform: [
        {
          translateY: EXPLORE_SWIPE_STACK_OFFSET_Y * (1 - dragProgress),
        },
        {
          scale: restingScale + EXPLORE_SWIPE_STACK_SCALE_STEP * dragProgress,
        },
      ],
    };
  });

  const previousStackAnimatedStyle = useAnimatedStyle(() => {
    const restingScale = 1 - EXPLORE_SWIPE_STACK_SCALE_STEP;

    if (translateY.value <= 0 || canSwipeBackSv.value === 0) {
      return {
        opacity: 0,
        transform: [
          { translateY: -EXPLORE_SWIPE_STACK_OFFSET_Y },
          { scale: restingScale },
        ],
      };
    }

    const dragProgress = Math.min(translateY.value / (cardHeight * 0.42), 1);

    return {
      opacity: dragProgress,
      transform: [
        {
          translateY: -EXPLORE_SWIPE_STACK_OFFSET_Y * (1 - dragProgress),
        },
        {
          scale: restingScale + EXPLORE_SWIPE_STACK_SCALE_STEP * dragProgress,
        },
      ],
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const dragDistance = Math.hypot(translateX.value, translateY.value);

    const dragOpacity = interpolate(
      dragDistance,
      [0, cardHeight * 0.5, cardHeight * 1.1],
      [1, 0.94, 0.72],
      Extrapolation.CLAMP,
    );

    const dragScale = interpolate(
      dragDistance,
      [0, cardHeight * 0.8],
      [1, 0.96],
      Extrapolation.CLAMP,
    );

    const rotation =
      (translateX.value / Math.max(cardWidth, 1)) * EXPLORE_SWIPE_MAX_ROTATION;

    return {
      opacity: dragOpacity,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale: dragScale },
      ],
    };
  });

  return (
    <>
      {nextCountry ? (
        <Animated.View
          style={[styles.stackCard, nextStackAnimatedStyle]}
          pointerEvents="none"
        >
          <ExploreSwipeCard
            country={nextCountry}
            width={cardWidth}
            height={cardHeight}
            interactive={false}
          />
        </Animated.View>
      ) : null}

      {previousCountry ? (
        <Animated.View
          style={[styles.stackCard, previousStackAnimatedStyle]}
          pointerEvents="none"
        >
          <ExploreSwipeCard
            country={previousCountry}
            width={cardWidth}
            height={cardHeight}
            interactive={false}
          />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.topCard, animatedStyle]}>
          <ExploreSwipeCard
            country={country}
            width={cardWidth}
            height={cardHeight}
            interactive
            heroIndex={heroIndex}
            heroScrollEnabled
            onHeroIndexChange={setHeroIndex}
          />
        </Animated.View>
      </GestureDetector>
    </>
  );
}

type SwipeablePlaceTopCardProps = {
  item: PlaceFeedItem;
  nextItem?: PlaceFeedItem;
  previousItem?: PlaceFeedItem;
  cardWidth: number;
  cardHeight: number;
  canGoBack: boolean;
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
};

function SwipeablePlaceTopCard({
  item,
  nextItem,
  previousItem,
  cardWidth,
  cardHeight,
  canGoBack,
  onSwipeNext,
  onSwipePrevious,
}: SwipeablePlaceTopCardProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const canSwipeBackSv = useSharedValue(canGoBack ? 1 : 0);
  const hasNextSv = useSharedValue(nextItem ? 1 : 0);

  const canSwipeBack = canGoBack;

  useEffect(() => {
    canSwipeBackSv.value = canSwipeBack ? 1 : 0;
  }, [canSwipeBack, canSwipeBackSv]);

  useEffect(() => {
    hasNextSv.value = nextItem ? 1 : 0;
  }, [hasNextSv, nextItem]);

  const triggerSwipeHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const completeSwipeNext = useCallback(() => {
    onSwipeNext();
  }, [onSwipeNext]);

  const completeSwipePrevious = useCallback(() => {
    onSwipePrevious();
  }, [onSwipePrevious]);

  const pan = Gesture.Pan()
    .activeOffsetY([
      -EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
      EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
    ])
    .failOffsetX([
      -EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
      EXPLORE_SWIPE_GESTURE_AXIS_ACTIVATION,
    ])
    .onUpdate((event) => {
      if (isDismissing.value) return;

      let y = event.translationY;

      if (y > 0 && canSwipeBackSv.value === 0) {
        y = rubberBandOffset(y);
      } else if (y < 0 && hasNextSv.value === 0) {
        y = rubberBandOffset(y);
      }

      translateY.value = y;
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (isDismissing.value) return;

      const y = translateY.value;
      const threshold = cardHeight * EXPLORE_SWIPE_DISMISS_THRESHOLD;
      const shouldDismiss =
        Math.abs(y) > threshold ||
        Math.abs(event.velocityY) > EXPLORE_SWIPE_VELOCITY_THRESHOLD;

      if (!shouldDismiss) {
        translateY.value = withSpring(0, RETURN_SPRING);
        translateX.value = withSpring(0, RETURN_SPRING);
        return;
      }

      const goingUp = y + event.velocityY * 0.08 < 0;

      if (goingUp) {
        if (hasNextSv.value === 0) {
          translateY.value = withSpring(0, RETURN_SPRING);
          translateX.value = withSpring(0, RETURN_SPRING);
          return;
        }

        isDismissing.value = true;
        runOnJS(triggerSwipeHaptic)();

        const target = -cardHeight * 1.45;
        const duration = dismissDuration(Math.abs(target - y), event.velocityY);

        translateY.value = withTiming(
          target,
          { duration, easing: DISMISS_EASING },
          (finished) => {
            if (finished) {
              runOnJS(completeSwipeNext)();
            }
          },
        );
        translateX.value = withTiming(translateX.value * 1.55, {
          duration,
          easing: DISMISS_EASING,
        });
        return;
      }

      if (canSwipeBackSv.value === 0) {
        translateY.value = withSpring(0, RETURN_SPRING);
        translateX.value = withSpring(0, RETURN_SPRING);
        return;
      }

      isDismissing.value = true;
      runOnJS(triggerSwipeHaptic)();

      const target = cardHeight * 1.45;
      const duration = dismissDuration(Math.abs(target - y), event.velocityY);

      translateY.value = withTiming(
        target,
        { duration, easing: DISMISS_EASING },
        (finished) => {
          if (finished) {
            runOnJS(completeSwipePrevious)();
          }
        },
      );
      translateX.value = withTiming(translateX.value * 1.55, {
        duration,
        easing: DISMISS_EASING,
      });
    });

  const nextStackAnimatedStyle = useAnimatedStyle(() => {
    const restingScale = 1 - EXPLORE_SWIPE_STACK_SCALE_STEP;

    if (translateY.value >= 0) {
      return {
        opacity: 1,
        transform: [
          { translateY: EXPLORE_SWIPE_STACK_OFFSET_Y },
          { scale: restingScale },
        ],
      };
    }

    const dragProgress = Math.min(
      Math.abs(translateY.value) / (cardHeight * 0.42),
      1,
    );

    return {
      opacity: 1,
      transform: [
        {
          translateY: EXPLORE_SWIPE_STACK_OFFSET_Y * (1 - dragProgress),
        },
        {
          scale: restingScale + EXPLORE_SWIPE_STACK_SCALE_STEP * dragProgress,
        },
      ],
    };
  });

  const previousStackAnimatedStyle = useAnimatedStyle(() => {
    const restingScale = 1 - EXPLORE_SWIPE_STACK_SCALE_STEP;

    if (translateY.value <= 0 || canSwipeBackSv.value === 0) {
      return {
        opacity: 0,
        transform: [
          { translateY: -EXPLORE_SWIPE_STACK_OFFSET_Y },
          { scale: restingScale },
        ],
      };
    }

    const dragProgress = Math.min(translateY.value / (cardHeight * 0.42), 1);

    return {
      opacity: dragProgress,
      transform: [
        {
          translateY: -EXPLORE_SWIPE_STACK_OFFSET_Y * (1 - dragProgress),
        },
        {
          scale: restingScale + EXPLORE_SWIPE_STACK_SCALE_STEP * dragProgress,
        },
      ],
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const dragDistance = Math.hypot(translateX.value, translateY.value);

    const dragOpacity = interpolate(
      dragDistance,
      [0, cardHeight * 0.5, cardHeight * 1.1],
      [1, 0.94, 0.72],
      Extrapolation.CLAMP,
    );

    const dragScale = interpolate(
      dragDistance,
      [0, cardHeight * 0.8],
      [1, 0.96],
      Extrapolation.CLAMP,
    );

    const rotation =
      (translateX.value / Math.max(cardWidth, 1)) * EXPLORE_SWIPE_MAX_ROTATION;

    return {
      opacity: dragOpacity,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale: dragScale },
      ],
    };
  });

  const itemKey = `${item.landmark.id}-${item.country.name}`;

  return (
    <>
      {nextItem ? (
        <Animated.View
          style={[styles.stackCard, nextStackAnimatedStyle]}
          pointerEvents="none"
        >
          <ExploreSwipePlaceCard
            item={nextItem}
            width={cardWidth}
            height={cardHeight}
            interactive={false}
          />
        </Animated.View>
      ) : null}

      {previousItem ? (
        <Animated.View
          style={[styles.stackCard, previousStackAnimatedStyle]}
          pointerEvents="none"
        >
          <ExploreSwipePlaceCard
            item={previousItem}
            width={cardWidth}
            height={cardHeight}
            interactive={false}
          />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.topCard, animatedStyle]}>
          <ExploreSwipePlaceCard
            key={itemKey}
            item={item}
            width={cardWidth}
            height={cardHeight}
            interactive
          />
        </Animated.View>
      </GestureDetector>
    </>
  );
}

type ExploreSwipeDeckProps = {
  countries: Country[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onNeedMore: () => void;
};

export function ExploreSwipeDeck({
  countries,
  currentIndex,
  onIndexChange,
  onNeedMore,
}: ExploreSwipeDeckProps) {
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const places = useCountryFeedStore((s) => s.places);
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const setRegionFilter = useCountryFeedStore((s) => s.setRegionFilter);
  const [deckLayout, setDeckLayout] = useState({ width: 0, height: 0 });
  const isPlacesMode = discoveryMode === "places";
  const queueLength = isPlacesMode ? places.length : countries.length;
  const currentPlace = places[currentIndex];
  const currentCountry = countries[currentIndex];
  const nextPlace = places[currentIndex + 1];
  const nextCountry = countries[currentIndex + 1];
  const previousPlace = currentIndex > 0 ? places[currentIndex - 1] : undefined;
  const previousCountry =
    currentIndex > 0 ? countries[currentIndex - 1] : undefined;

  const innerWidth = Math.max(0, deckLayout.width);
  const cardWidth = innerWidth;
  const cardHeight = Math.max(0, Math.round(deckLayout.height));

  useEffect(() => {
    if (isPlacesMode || countries.length === 0) return;
    void prefetchFeedHeroImagesAroundIndex(countries, currentIndex);
  }, [countries, currentIndex, isPlacesMode]);

  const handleSwipeBegin = useCallback(() => {
    if (isPlacesMode) return;
    warmFeedHeroesOnSwipeBegin(countries, currentIndex);
  }, [countries, currentIndex, isPlacesMode]);

  const handleSwipeNext = useCallback(() => {
    onIndexChange(currentIndex + 1);

    const state = useCountryFeedStore.getState();
    const nextIndex = currentIndex + 1;
    if (
      state.discoveryMode === "forYou" &&
      state.nextCursor !== null &&
      nextIndex >= state.countries.length - 2 &&
      state.status !== "loading" &&
      state.status !== "loadingMore"
    ) {
      onNeedMore();
    }
  }, [currentIndex, onIndexChange, onNeedMore]);

  const handleSwipePrevious = useCallback(() => {
    if (currentIndex <= 0) return;
    onIndexChange(currentIndex - 1);
  }, [currentIndex, onIndexChange]);

  const onDeckLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDeckLayout({
      width: Math.round(width),
      height: Math.round(height),
    });
  }, []);

  if (cardWidth <= 0 || cardHeight <= 0) {
    return <View style={styles.deck} onLayout={onDeckLayout} />;
  }

  if (currentIndex >= queueLength) {
    const showRegionComplete =
      discoveryMode === "region" &&
      selectedRegion !== null &&
      isContinent(selectedRegion);

    return (
      <View style={styles.deck} onLayout={onDeckLayout}>
        <View style={styles.cardStage} pointerEvents="box-none">
          {showRegionComplete ? (
            <ExploreRegionCompleteState
              region={selectedRegion}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              onContinue={(nextRegion) => {
                void setRegionFilter(nextRegion);
              }}
            />
          ) : (
            <View
              style={[
                styles.emptyState,
                { width: cardWidth, height: cardHeight },
              ]}
            >
              <Text style={styles.emptyTitle}>
                {discoveryMode === "saved"
                  ? "All saved countries viewed"
                  : discoveryMode === "places"
                    ? "All places viewed"
                    : "All caught up"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {discoveryMode === "saved"
                  ? "Save more countries or switch feeds to keep exploring"
                  : discoveryMode === "places"
                    ? "Switch feeds to discover more landmarks"
                    : "Change your feed filters to discover more countries"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.deck} onLayout={onDeckLayout}>
      <View style={styles.cardStage} pointerEvents="box-none">
        <View
          style={[
            styles.stack,
            {
              width: cardWidth,
              height: cardHeight,
            },
          ]}
          pointerEvents="box-none"
        >
          {isPlacesMode && currentPlace ? (
            <SwipeablePlaceTopCard
              key={`${currentPlace.landmark.id}-${currentIndex}`}
              item={currentPlace}
              nextItem={nextPlace}
              previousItem={previousPlace}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              canGoBack={currentIndex > 0}
              onSwipeNext={handleSwipeNext}
              onSwipePrevious={handleSwipePrevious}
            />
          ) : currentCountry ? (
            <SwipeableTopCard
              key={`${currentCountry.name}-${currentIndex}`}
              country={currentCountry}
              nextCountry={nextCountry}
              previousCountry={previousCountry}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              canGoBack={currentIndex > 0}
              onSwipeNext={handleSwipeNext}
              onSwipePrevious={handleSwipePrevious}
              onSwipeBegin={handleSwipeBegin}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    position: "relative",
    backgroundColor: "transparent",
  },
  cardStage: {
    flex: 1,
    zIndex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  stack: {
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible",
  },
  stackCard: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  topCard: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  emptyState: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: EXPLORE_SWIPE_CARD_RADIUS,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_TEXT_HEADER,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
    textAlign: "center",
  },
});
