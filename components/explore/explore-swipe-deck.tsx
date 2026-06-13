import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ExploreSwipeCard } from "@/components/explore/explore-swipe-card";
import {
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_RADIUS,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_DISMISS_THRESHOLD,
  EXPLORE_SWIPE_MAX_ROTATION,
  EXPLORE_SWIPE_STACK_DEPTH,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_HEADER,
} from "@/constants/explore-swipe-layout";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import type { Country } from "@/types/country";

type SwipeDirection = "left" | "right";

type SwipeableTopCardProps = {
  country: Country;
  cardWidth: number;
  cardHeight: number;
  canGoBack: boolean;
  onDismiss: (direction: SwipeDirection) => void;
  onGoBack: () => void;
};

function SwipeableTopCard({
  country,
  cardWidth,
  cardHeight,
  canGoBack,
  onDismiss,
  onGoBack,
}: SwipeableTopCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(0);
  }, [country.name]);

  const dismissCard = useCallback(
    (direction: SwipeDirection) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDismiss(direction);
    },
    [onDismiss],
  );

  const goBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGoBack();
  }, [onGoBack]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (isDismissing.value) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.35;
    })
    .onEnd((event) => {
      if (isDismissing.value) return;

      const threshold = cardWidth * EXPLORE_SWIPE_DISMISS_THRESHOLD;
      const shouldDismiss =
        Math.abs(translateX.value) > threshold ||
        Math.abs(event.velocityX) > 900;

      if (shouldDismiss) {
        isDismissing.value = true;
        const direction: SwipeDirection =
          translateX.value + event.velocityX * 0.08 > 0 ? "right" : "left";

        if (direction === "right") {
          if (!canGoBack || heroIndex > 0) {
            isDismissing.value = false;
            translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
            translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
            return;
          }

          translateX.value = withTiming(
            cardWidth * 1.4,
            { duration: 220 },
            (finished) => {
              if (finished) {
                runOnJS(goBack)();
              }
            },
          );
          return;
        }

        const targetX = -cardWidth * 1.4;

        translateX.value = withTiming(
          targetX,
          { duration: 220 },
          (finished) => {
            if (finished) {
              runOnJS(dismissCard)(direction);
            }
          },
        );
        return;
      }

      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotation =
      (translateX.value / Math.max(cardWidth, 1)) * EXPLORE_SWIPE_MAX_ROTATION;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.topCard, animatedStyle]}>
        <ExploreSwipeCard
          country={country}
          width={cardWidth}
          height={cardHeight}
          interactive
          onHeroIndexChange={setHeroIndex}
        />
      </Animated.View>
    </GestureDetector>
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
  const [deckLayout, setDeckLayout] = useState({ width: 0, height: 0 });

  const visibleCountries = useMemo(() => {
    const slice = countries.slice(
      currentIndex,
      currentIndex + EXPLORE_SWIPE_STACK_DEPTH + 1,
    );
    return slice.reverse();
  }, [countries, currentIndex]);

  const innerWidth = Math.max(
    0,
    deckLayout.width - EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING * 2,
  );
  const cardWidth = innerWidth;
  const cardHeight = Math.max(0, Math.round(deckLayout.height));

  const handleDismiss = useCallback(
    (_direction: SwipeDirection) => {
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
    },
    [currentIndex, onIndexChange, onNeedMore],
  );

  const handleGoBack = useCallback(() => {
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

  if (currentIndex >= countries.length) {
    return (
      <View style={styles.deck} onLayout={onDeckLayout}>
        <View
          style={[styles.emptyState, { width: cardWidth, height: cardHeight }]}
        >
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySubtitle}>
            Change your feed filters to discover more countries
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.deck} onLayout={onDeckLayout}>
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
        {visibleCountries.map((country, reversedIndex) => {
          const stackIndex = visibleCountries.length - 1 - reversedIndex;
          const isTop = stackIndex === 0;

          if (isTop) {
            return (
              <SwipeableTopCard
                key={`${country.name}-${currentIndex}`}
                country={country}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                canGoBack={currentIndex > 0}
                onDismiss={handleDismiss}
                onGoBack={handleGoBack}
              />
            );
          }

          const scale = 1 - stackIndex * 0.03;
          const offsetX = stackIndex * -6;
          const offsetY = stackIndex * -8;

          return (
            <View
              key={`${country.name}-${currentIndex + stackIndex}`}
              style={[
                styles.stackCard,
                {
                  transform: [
                    { scale },
                    { translateX: offsetX },
                    { translateY: offsetY },
                  ],
                  zIndex: -stackIndex,
                },
              ]}
              pointerEvents="none"
            >
              <ExploreSwipeCard
                country={country}
                width={cardWidth}
                height={cardHeight}
                interactive={false}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
    backgroundColor: "transparent",
  },
  stack: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  topCard: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  stackCard: {
    ...StyleSheet.absoluteFillObject,
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
