import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { prefetchCountryImage } from "@/components/explore/country-image";
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
import { images as appImages } from "@/constants/images";
import type { CountryLandmark } from "@/lib/api";
import {
  formatLandmarkDescription,
  formatLandmarkTypeDisplay,
  getCountryImages,
} from "@/lib/format-country";
import { normalizeImageUrl } from "@/lib/normalize-image-url";
import {
  openCountryDetail,
  warmCountryDetail,
} from "@/lib/open-country-detail";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";
import type { PlaceFeedItem } from "@/types/place-feed";

const IMAGE_CROSSFADE_MS = 320;
const PREVIEW_WIDTH = 48;
const PREVIEW_BLUR_RADIUS = 18;
const WIKIMEDIA_HEADERS = {
  "User-Agent": "WorldLoop/1.0 (Expo; country discovery app)",
};

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

const SHORT_DESCRIPTION_MAX_LENGTH = 20;

function landmarkImageSource(uri: string) {
  return {
    uri,
    headers: uri.includes("wikimedia.org") ? WIKIMEDIA_HEADERS : undefined,
  };
}

function landmarkPreviewUri(fullUri: string): string {
  if (fullUri.includes("/thumb/")) {
    return fullUri.replace(/\/\d+px-/, `/${PREVIEW_WIDTH}px-`);
  }

  try {
    const url = new URL(fullUri);
    if (url.hostname.includes("wikimedia.org")) {
      url.searchParams.set("width", String(PREVIEW_WIDTH));
      return url.href;
    }
  } catch {
    return fullUri;
  }

  return fullUri;
}

export function formatPlaceCardDescription(
  landmark: CountryLandmark,
  country: Country,
): string {
  const trimmed = landmark.description?.trim() ?? "";
  if (trimmed.length > SHORT_DESCRIPTION_MAX_LENGTH) {
    return formatLandmarkDescription(trimmed);
  }

  const type = formatLandmarkTypeDisplay(landmark.type);
  if (landmark.type?.trim()) {
    return `${type} in ${country.name}`;
  }

  return `Discover more in ${country.name}`;
}

function resolvePlaceHeroUri(
  landmark: CountryLandmark,
  country: Country,
): string | null {
  if (landmark.imageUrl) {
    return normalizeImageUrl(landmark.imageUrl);
  }

  const countryImages = getCountryImages(country);
  return countryImages[0] ? normalizeImageUrl(countryImages[0]) : null;
}

type PlaceHeroImageProps = {
  landmark: CountryLandmark;
  country: Country;
  width: number;
  height: number;
  interactive: boolean;
  onPress?: () => void;
  onPressIn?: () => void;
};

function PlaceHeroImage({
  landmark,
  country,
  width,
  height,
  interactive,
  onPress,
  onPressIn,
}: PlaceHeroImageProps) {
  const normalizedUri = useMemo(
    () => resolvePlaceHeroUri(landmark, country),
    [country, landmark],
  );
  const previewUri = useMemo(
    () => (normalizedUri ? landmarkPreviewUri(normalizedUri) : null),
    [normalizedUri],
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!normalizedUri) {
      setFailed(true);
      return;
    }

    setFailed(false);
    void prefetchCountryImage(normalizedUri);
    if (previewUri && previewUri !== normalizedUri) {
      void prefetchCountryImage(previewUri);
    }
  }, [normalizedUri, previewUri]);

  const hero =
    !normalizedUri || failed ? (
      <Image
        source={appImages.earthTopography}
        style={{ width, height }}
        contentFit="cover"
        accessibilityLabel={`${landmark.name} placeholder`}
      />
    ) : (
      <View style={{ width, height }}>
        <Image
          source={
            previewUri
              ? landmarkImageSource(previewUri)
              : landmarkImageSource(normalizedUri)
          }
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          blurRadius={PREVIEW_BLUR_RADIUS}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Image
          source={landmarkImageSource(normalizedUri)}
          placeholder={
            previewUri
              ? landmarkImageSource(previewUri)
              : landmarkImageSource(normalizedUri)
          }
          placeholderContentFit="cover"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={normalizedUri}
          transition={{
            duration: IMAGE_CROSSFADE_MS,
            effect: "cross-dissolve",
          }}
          accessibilityLabel={landmark.name}
          onError={() => setFailed(true)}
        />
      </View>
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${landmark.name} in ${country.name}`}
      accessibilityHint="Opens country detail"
      disabled={!interactive}
      onPress={onPress}
      onPressIn={onPressIn}
      style={{ width, height, overflow: "hidden" }}
    >
      {({ pressed }) => (
        <>
          {hero}
          {pressed && interactive && onPress ? (
            <View style={styles.heroPressOverlay} pointerEvents="none" />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

type ExploreSwipePlaceCardProps = {
  item: PlaceFeedItem;
  width: number;
  height: number;
  interactive?: boolean;
};

export function ExploreSwipePlaceCard({
  item,
  width,
  height,
  interactive = true,
}: ExploreSwipePlaceCardProps) {
  const { landmark, country } = item;
  const subtitle = `${formatLandmarkTypeDisplay(landmark.type)} · ${country.name}`;
  const description = formatPlaceCardDescription(landmark, country);

  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));

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
        <View style={styles.imageRegion} onLayout={onImageRegionLayout}>
          {heroSize.width > 0 && heroSize.height > 0 ? (
            <PlaceHeroImage
              landmark={landmark}
              country={country}
              width={heroSize.width}
              height={heroSize.height}
              interactive={interactive}
              onPress={interactive ? openDetail : undefined}
              onPressIn={interactive ? warmDetail : undefined}
            />
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${country.name} details`}
          accessibilityHint="Opens country detail"
          disabled={!interactive}
          onPress={interactive ? openDetail : undefined}
          onPressIn={interactive ? warmDetail : undefined}
          style={styles.infoRegion}
        >
          {({ pressed }) => (
            <>
              <View style={styles.titleRow}>
                <View style={styles.titleBlock}>
                  <Text
                    style={styles.placeName}
                    numberOfLines={EXPLORE_SWIPE_CARD_TITLE_MAX_LINES}
                  >
                    {landmark.name}
                  </Text>

                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
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
                <Text style={styles.factLabel}>About</Text>
                <Text
                  style={styles.factText}
                  numberOfLines={EXPLORE_SWIPE_CARD_FACT_MAX_LINES}
                >
                  {description}
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
  heroPressOverlay: {
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
  placeName: {
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
