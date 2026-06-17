import { MediaCarousel } from "@/components/explore/media-carousel";
import { COUNTRY_DETAIL_MODULE_BG } from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";

type CountryFactsCarouselProps = {
  facts: string[];
};

export function CountryFactsCarousel({ facts }: CountryFactsCarouselProps) {
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const updateIndexFromOffset = useCallback(
    (offsetX: number) => {
      if (carouselWidth <= 0 || facts.length === 0) return;
      const index = Math.round(offsetX / carouselWidth);
      const clamped = Math.max(0, Math.min(index, facts.length - 1));
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));
    },
    [carouselWidth, facts.length],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateIndexFromOffset(event.nativeEvent.contentOffset.x);
  };

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    updateIndexFromOffset(event.nativeEvent.contentOffset.x);
  };

  const handleLayout = (width: number) => {
    if (width > 0 && Math.abs(width - carouselWidth) > 1) {
      setCarouselWidth(width);
    }
  };

  const handleIndexChange = (index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  if (facts.length === 0) {
    return null;
  }

  if (facts.length === 1) {
    return (
      <View
        style={styles.factCallout}
        onLayout={(event) => handleLayout(event.nativeEvent.layout.width)}
      >
        <Text style={styles.factCalloutText}>{facts[0]}</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={(event) => handleLayout(event.nativeEvent.layout.width)}
    >
      {carouselWidth > 0 ? (
        <FlatList
          ref={listRef}
          data={facts}
          keyExtractor={(fact, index) => `${index}-${fact.slice(0, 24)}`}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={{ width: carouselWidth }}
          getItemLayout={(_, index) => ({
            length: carouselWidth,
            offset: carouselWidth * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <View style={[styles.slide, { width: carouselWidth }]}>
              <View style={styles.factCallout}>
                <Text
                  style={styles.factCalloutText}
                  accessibilityLabel={`Fact ${index + 1} of ${facts.length}`}
                >
                  {item}
                </Text>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.factCallout}>
          <Text style={styles.factCalloutText}>{facts[0]}</Text>
        </View>
      )}

      <View
        style={styles.paginationWrap}
        accessibilityLabel={`Fact ${activeIndex + 1} of ${facts.length}`}
      >
        <MediaCarousel
          images={facts}
          activeIndex={activeIndex}
          onImageIndexChange={handleIndexChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: 10,
  },
  slide: {},
  factCallout: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  factCalloutText: {
    fontFamily: "Poppins-Regular",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    lineHeight: EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  },
  paginationWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
