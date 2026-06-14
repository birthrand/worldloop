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
  EXPLORE_SWIPE_CARD_FACT_LABEL_COLOR,
  EXPLORE_SWIPE_CARD_FACT_LABEL_FONT_SIZE,
  EXPLORE_SWIPE_CARD_FACT_LABEL_GAP,
  EXPLORE_SWIPE_CARD_FACT_LABEL_LINE_HEIGHT,
  EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT,
  EXPLORE_SWIPE_CARD_FACT_MAX_LINES,
  EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  EXPLORE_SWIPE_CARD_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_INFO_HEADER_GAP,
  EXPLORE_SWIPE_CARD_INFO_HEADER_MAX_HEIGHT,
  EXPLORE_SWIPE_CARD_INFO_REGION_GAP,
  EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT,
  EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_BOTTOM,
  EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_TOP,
  EXPLORE_SWIPE_CARD_INFO_TITLE_ACTION_GAP,
  EXPLORE_SWIPE_CARD_PRESS_OVERLAY,
  EXPLORE_SWIPE_CARD_RADIUS,
  EXPLORE_SWIPE_CARD_SHADOW,
  EXPLORE_SWIPE_CARD_SHADOW_OFFSET_Y,
  EXPLORE_SWIPE_CARD_SHADOW_OPACITY,
  EXPLORE_SWIPE_CARD_SHADOW_RADIUS,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_MAX_LINES,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
  EXPLORE_SWIPE_TEXT_HEADER,
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";
import { continentDisplayLabel } from "@/constants/regions";
import {
  formatCountryCapitalDisplay,
  getAiFactByIndex,
  getCountryImages,
} from "@/lib/format-country";
import {
  openCountryDetail,
  warmCountryDetail,
} from "@/lib/open-country-detail";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

/** Keeps the glyph on the content edge while preserving a 40×40 touch target. */
const BOOKMARK_HIT_SLOP = {
  top:
    (EXPLORE_SWIPE_ACTION_BUTTON_SIZE - EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE) /
    2,
  bottom:
    (EXPLORE_SWIPE_ACTION_BUTTON_SIZE - EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE) /
    2,
  left:
    (EXPLORE_SWIPE_ACTION_BUTTON_SIZE - EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE) /
    2,
  right:
    (EXPLORE_SWIPE_ACTION_BUTTON_SIZE - EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE) /
    2,
} as const;

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
  /** Controlled hero slide — used by the swipe deck for release-time axis routing. */
  heroIndex?: number;
  onHeroIndexChange?: (index: number) => void;
  /** When false, horizontal swipes are handled by the deck gesture instead. */
  heroScrollEnabled?: boolean;
};

export function ExploreSwipeCard({
  country,
  width,
  height,
  interactive = true,
  heroIndex: heroIndexProp,
  onHeroIndexChange,
  heroScrollEnabled = true,
}: ExploreSwipeCardProps) {
  const images = useMemo(() => getCountryImages(country), [country]);
  const capitalLabel = formatCountryCapitalDisplay(country.capital);
  const regionLabel = continentDisplayLabel(country.region?.trim() || "—");

  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));

  const [internalHeroIndex, setInternalHeroIndex] = useState(0);
  const heroIndex = heroIndexProp ?? internalHeroIndex;

  const updateHeroIndex = useCallback(
    (index: number) => {
      if (heroIndexProp === undefined) {
        setInternalHeroIndex(index);
      }
      onHeroIndexChange?.(index);
    },
    [heroIndexProp, onHeroIndexChange],
  );
  const [isActiveHeroLoaded, setIsActiveHeroLoaded] = useState(() =>
    isCountryHeroReady(images),
  );
  const estimatedHeroHeight = Math.max(
    0,
    height - EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT,
  );
  const [heroSize, setHeroSize] = useState({
    width,
    height: estimatedHeroHeight,
  });

  useEffect(() => {
    setHeroSize({
      width,
      height: estimatedHeroHeight,
    });
  }, [estimatedHeroHeight, width]);

  const onImageRegionLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: layoutWidth, height: layoutHeight } =
      event.nativeEvent.layout;
    setHeroSize({
      width: Math.round(layoutWidth),
      height: Math.round(layoutHeight),
    });
  }, []);

  const fact = useMemo(
    () => getAiFactByIndex(country, heroIndex),
    [country, heroIndex],
  );

  useEffect(() => {
    if (heroIndexProp === undefined) {
      setInternalHeroIndex(0);
    }
    setIsActiveHeroLoaded(isCountryHeroReady(images));
  }, [country.name, heroIndexProp, images]);

  useEffect(() => {
    if (heroIndexProp !== undefined) return;
    onHeroIndexChange?.(heroIndex);
  }, [heroIndex, heroIndexProp, onHeroIndexChange]);

  useEffect(() => {
    for (const uri of images) {
      void prefetchCountryImage(uri);
    }
  }, [images]);

  const openDetail = useCallback(() => {
    warmCountryDetail(country);
    openCountryDetail(country, { from: "explore", heroIndex });
  }, [country, heroIndex]);

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
        <View style={styles.imageRegion} onLayout={onImageRegionLayout}>
          {heroSize.width > 0 && heroSize.height > 0 ? (
            <HeroImagePager
              images={images}
              flag={country.flag}
              iso2={country.cca2}
              heroWidth={heroSize.width}
              heroHeight={heroSize.height}
              activeIndex={heroIndex}
              onIndexChange={updateHeroIndex}
              scrollEnabled={heroScrollEnabled}
              onImagePress={interactive ? openDetail : undefined}
              onActiveImageLoadChange={setIsActiveHeroLoaded}
            />
          ) : null}

          {images.length > 1 && isActiveHeroLoaded ? (
            <View style={styles.carouselOverlay} pointerEvents="box-none">
              <MediaCarousel
                images={images}
                activeIndex={heroIndex}
                onImageIndexChange={updateHeroIndex}
                disabled={!interactive}
                variant="segments"
              />
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${country.name} details`}
          accessibilityHint="Opens country detail"
          disabled={!interactive}
          onPress={interactive ? openDetail : undefined}
          style={styles.infoRegion}
        >
          {({ pressed }) => (
            <>
              <View style={styles.titleRow}>
                <View style={styles.titleBlock}>
                  <Text
                    style={styles.countryName}
                    numberOfLines={EXPLORE_SWIPE_CARD_TITLE_MAX_LINES}
                  >
                    {country.name}
                  </Text>

                  <Text style={styles.subtitle} numberOfLines={1}>
                    {regionLabel} · {capitalLabel}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSaved ? `Unsave ${country.name}` : `Save ${country.name}`
                  }
                  accessibilityHint={
                    isSaved
                      ? "Removes this country from your saved list"
                      : "Adds this country to your saved list"
                  }
                  disabled={!interactive}
                  onPress={handleToggleSaved}
                  hitSlop={BOOKMARK_HIT_SLOP}
                  style={({ pressed: bookmarkPressed }) => [
                    styles.bookmarkButton,
                    bookmarkPressed &&
                      interactive &&
                      styles.bookmarkButtonPressed,
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

              <View style={styles.factSection}>
                <Text style={styles.factLabel}>Did you know</Text>
                <Text
                  style={styles.factText}
                  numberOfLines={EXPLORE_SWIPE_CARD_FACT_MAX_LINES}
                >
                  {fact}
                </Text>
              </View>

              <View style={styles.infoRegionSpacer} />

              {pressed && interactive ? (
                <View
                  style={styles.infoRegionPressOverlay}
                  pointerEvents="none"
                />
              ) : null}
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    overflow: "visible",
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
    borderTopLeftRadius: EXPLORE_SWIPE_CARD_RADIUS,
    borderTopRightRadius: EXPLORE_SWIPE_CARD_RADIUS,
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
    overflow: "hidden",
    height: EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT,
    paddingTop: EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_TOP,
    paddingBottom: EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_BOTTOM,
    paddingHorizontal: EXPLORE_SWIPE_CARD_HORIZONTAL_PADDING,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  infoRegionPressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EXPLORE_SWIPE_CARD_PRESS_OVERLAY,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    height: EXPLORE_SWIPE_CARD_INFO_HEADER_MAX_HEIGHT,
    gap: EXPLORE_SWIPE_CARD_INFO_TITLE_ACTION_GAP,
  },
  infoRegionSpacer: {
    flex: 1,
    minHeight: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: EXPLORE_SWIPE_CARD_INFO_HEADER_GAP,
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
  bookmarkButton: {
    width: EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE,
    height: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bookmarkButtonPressed: {
    opacity: 0.78,
  },
  factSection: {
    alignSelf: "stretch",
    marginTop: EXPLORE_SWIPE_CARD_INFO_REGION_GAP,
    gap: EXPLORE_SWIPE_CARD_FACT_LABEL_GAP,
  },
  factLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: EXPLORE_SWIPE_CARD_FACT_LABEL_FONT_SIZE,
    lineHeight: EXPLORE_SWIPE_CARD_FACT_LABEL_LINE_HEIGHT,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: EXPLORE_SWIPE_CARD_FACT_LABEL_COLOR,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  factText: {
    fontFamily: EXPLORE_SWIPE_CARD_FACT_FONT_FAMILY,
    fontSize: EXPLORE_SWIPE_CARD_FACT_FONT_SIZE,
    lineHeight: EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
});
