import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import {
  isCountryImageReady,
  prefetchCountryImage,
} from "@/components/explore/country-image";
import { ExploreSwipeCardInfoSkeleton } from "@/components/explore/explore-swipe-card-info-skeleton";
import { HeroImagePager } from "@/components/explore/hero-image-pager";
import { MediaCarousel } from "@/components/explore/media-carousel";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
  EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR,
  EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE,
  EXPLORE_SWIPE_CARD_BORDER,
  EXPLORE_SWIPE_CARD_ELEVATION,
  EXPLORE_SWIPE_CARD_FACT_FONT_FAMILY,
  EXPLORE_SWIPE_CARD_FACT_FONT_SIZE,
  EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT,
  EXPLORE_SWIPE_CARD_FACT_MAX_LINES,
  EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT,
  EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP,
  EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_INFO_TEXT_GAP,
  EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT,
  EXPLORE_SWIPE_CARD_RADIUS,
  EXPLORE_SWIPE_CARD_SHADOW,
  EXPLORE_SWIPE_CARD_SHADOW_OFFSET_Y,
  EXPLORE_SWIPE_CARD_SHADOW_OPACITY,
  EXPLORE_SWIPE_CARD_SHADOW_RADIUS,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_MAX_LINES,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
  EXPLORE_SWIPE_TEXT_HEADER,
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";
import { continentDisplayLabel } from "@/constants/regions";
import { getAiFactByIndex, getCountryImages } from "@/lib/format-country";
import {
  openCountryDetail,
  warmCountryDetail,
} from "@/lib/open-country-detail";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

const CARD_ACTION_COUNT = 1;
const CARD_ACTION_RAIL_WIDTH =
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE * CARD_ACTION_COUNT +
  EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP * (CARD_ACTION_COUNT - 1);
const CARD_ACTION_OPTICAL_INSET =
  (EXPLORE_SWIPE_ACTION_BUTTON_SIZE - EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE) / 2;

function isCountryHeroReady(images: string[]): boolean {
  const heroUri = images[0];
  if (!heroUri) return true;
  return isCountryImageReady(heroUri);
}

type ExploreSwipeCardProps = {
  country: Country;
  width: number;
  height: number;
  /** When false, card is a static stack layer (no press/actions). */
  interactive?: boolean;
  onHeroIndexChange?: (index: number) => void;
};

export function ExploreSwipeCard({
  country,
  width,
  height,
  interactive = true,
  onHeroIndexChange,
}: ExploreSwipeCardProps) {
  const images = useMemo(() => getCountryImages(country), [country]);
  const capital = country.capital?.trim() || "—";
  const regionLabel = continentDisplayLabel(country.region?.trim() || "—");

  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));

  const [heroIndex, setHeroIndex] = useState(0);
  const [heroLayout, setHeroLayout] = useState({ width: 0, height: 0 });
  const [isActiveHeroLoaded, setIsActiveHeroLoaded] = useState(() =>
    isCountryHeroReady(images),
  );

  const fact = useMemo(
    () => getAiFactByIndex(country, heroIndex),
    [country, heroIndex],
  );

  useEffect(() => {
    setHeroIndex(0);
    setIsActiveHeroLoaded(isCountryHeroReady(images));
  }, [country.name, images]);

  useEffect(() => {
    onHeroIndexChange?.(heroIndex);
  }, [heroIndex, onHeroIndexChange]);

  useEffect(() => {
    for (const uri of images) {
      void prefetchCountryImage(uri);
    }
  }, [images]);

  const onHeroLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: layoutWidth, height: layoutHeight } =
      event.nativeEvent.layout;
    setHeroLayout({
      width: Math.round(layoutWidth),
      height: Math.round(layoutHeight),
    });
  }, []);

  const openDetail = () => {
    openCountryDetail(country, { from: "explore" });
  };

  const warmDetail = () => {
    warmCountryDetail(country);
  };

  const handleToggleSaved = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSaved(country);
  };

  return (
    <View
      style={[
        styles.cardShadow,
        {
          width,
          height,
          borderRadius: EXPLORE_SWIPE_CARD_RADIUS,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            width,
            height,
            borderRadius: EXPLORE_SWIPE_CARD_RADIUS,
          },
        ]}
      >
        <View style={styles.imageRegion} onLayout={onHeroLayout}>
          {heroLayout.width > 0 && heroLayout.height > 0 ? (
            <HeroImagePager
              images={images}
              flag={country.flag}
              iso2={country.cca2}
              heroWidth={heroLayout.width}
              heroHeight={heroLayout.height}
              activeIndex={heroIndex}
              onIndexChange={setHeroIndex}
              onImagePress={interactive ? openDetail : undefined}
              onImagePressIn={interactive ? warmDetail : undefined}
              onActiveImageLoadChange={setIsActiveHeroLoaded}
            />
          ) : null}

          {images.length > 1 && isActiveHeroLoaded ? (
            <View style={styles.carouselOverlay} pointerEvents="box-none">
              <MediaCarousel
                images={images}
                activeIndex={heroIndex}
                onImageIndexChange={setHeroIndex}
                disabled={!interactive}
                variant="segments"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.infoRegion}>
          {!isActiveHeroLoaded ? (
            <ExploreSwipeCardInfoSkeleton interactive={interactive} />
          ) : (
            <>
              <View style={styles.infoTopRow}>
                <View
                  style={[
                    styles.infoText,
                    interactive && styles.infoTextWithActions,
                  ]}
                >
                  <Text
                    style={styles.countryName}
                    numberOfLines={EXPLORE_SWIPE_CARD_TITLE_MAX_LINES}
                  >
                    {country.name}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {regionLabel} · {capital}
                  </Text>
                </View>

                {interactive ? (
                  <View style={styles.actions} pointerEvents="box-none">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isSaved
                          ? `Unsave ${country.name}`
                          : `Save ${country.name}`
                      }
                      accessibilityHint={
                        isSaved
                          ? "Removes this country from your saved list"
                          : "Adds this country to your saved list"
                      }
                      onPress={handleToggleSaved}
                      style={({ pressed }) => [
                        styles.actionButton,
                        pressed && styles.actionButtonPressed,
                      ]}
                    >
                      <Ionicons
                        name={isSaved ? "bookmark" : "bookmark-outline"}
                        size={EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE}
                        color={
                          isSaved
                            ? EXPLORE_SWIPE_ACCENT_COLOR
                            : EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR
                        }
                      />
                    </Pressable>
                  </View>
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Fun fact about ${country.name}`}
                accessibilityHint="Opens country detail"
                disabled={!interactive}
                onPress={interactive ? openDetail : undefined}
                onPressIn={interactive ? warmDetail : undefined}
                style={({ pressed }) => [
                  styles.factSection,
                  pressed && interactive && styles.factSectionPressed,
                ]}
              >
                <Text
                  style={styles.factText}
                  numberOfLines={EXPLORE_SWIPE_CARD_FACT_MAX_LINES}
                >
                  {fact}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: EXPLORE_SWIPE_CARD_SHADOW,
        shadowOffset: {
          width: 0,
          height: EXPLORE_SWIPE_CARD_SHADOW_OFFSET_Y,
        },
        shadowOpacity: EXPLORE_SWIPE_CARD_SHADOW_OPACITY,
        shadowRadius: EXPLORE_SWIPE_CARD_SHADOW_RADIUS,
      },
      android: {
        elevation: EXPLORE_SWIPE_CARD_ELEVATION,
      },
      default: {},
    }),
  },
  card: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_BORDER,
  },
  imageRegion: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  },
  carouselOverlay: {
    position: "absolute",
    top: 18,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  infoRegion: {
    flexShrink: 0,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  infoTopRow: {
    position: "relative",
    minHeight: EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT,
  },
  infoText: {
    gap: EXPLORE_SWIPE_CARD_INFO_TEXT_GAP,
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  },
  infoTextWithActions: {
    paddingRight:
      EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING +
      CARD_ACTION_RAIL_WIDTH -
      CARD_ACTION_OPTICAL_INSET,
  },
  countryName: {
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_TEXT_HEADER,
    lineHeight: EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    lineHeight: EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
  actions: {
    position: "absolute",
    right: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING - CARD_ACTION_OPTICAL_INSET,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP,
  },
  actionButton: {
    width: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    height: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPressed: {
    opacity: 0.78,
  },
  factSection: {
    alignSelf: "stretch",
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  },
  factSectionPressed: {
    opacity: 0.82,
  },
  factText: {
    fontFamily: EXPLORE_SWIPE_CARD_FACT_FONT_FAMILY,
    fontSize: EXPLORE_SWIPE_CARD_FACT_FONT_SIZE,
    lineHeight: EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT,
    minHeight: EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT,
    color: EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  },
});
