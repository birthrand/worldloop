import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Divider } from "@/components/ai-explorer/divider";
import { StatItem } from "@/components/ai-explorer/stat-item";
import { prefetchCountryImage } from "@/components/explore/country-image";
import { SwipeDismissSheet } from "@/components/explore/swipe-dismiss-sheet";
import { COUNTRY_DETAIL_MODULE_BG } from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
  EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR,
  EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE,
  EXPLORE_SWIPE_CARD_FACT_FONT_FAMILY,
  EXPLORE_SWIPE_CARD_FACT_FONT_SIZE,
  EXPLORE_SWIPE_CARD_FACT_LABEL_COLOR,
  EXPLORE_SWIPE_CARD_FACT_LABEL_FONT_SIZE,
  EXPLORE_SWIPE_CARD_FACT_LABEL_GAP,
  EXPLORE_SWIPE_CARD_FACT_LABEL_LINE_HEIGHT,
  EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT,
  EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_INFO_TITLE_ACTION_GAP,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_ACTIONS_OVERLAP,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
} from "@/constants/explore-swipe-layout";
import { images as appImages } from "@/constants/images";
import type { CountryLandmark } from "@/lib/api";
import { fetchLandmarkAi } from "@/lib/api";
import {
  formatLandmarkCity,
  formatLandmarkDescription,
  formatLandmarkHeritageDisplay,
  formatLandmarkTypeDisplay,
  inferLandmarkCityFromTextSources,
  isLandmarkUnesco,
} from "@/lib/format-country";
import {
  cacheLandmarkImageDimensions,
  getCachedLandmarkImageDimensions,
} from "@/lib/landmark-image-dimensions";
import { normalizeImageUrl } from "@/lib/normalize-image-url";
import { openLandmarkOnMap } from "@/lib/open-landmark-on-map";
import {
  getStaticLandmarkAiById,
  isStaticLandmarkDetailsCatalogEnabled,
} from "@/lib/static-landmark-details";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import { useRecentlyViewedStore } from "@/store/use-recently-viewed-store";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import type { Country } from "@/types/country";

const HERO_HEIGHT_LANDSCAPE = 260;
const HERO_HEIGHT_PORTRAIT_MAX = 420;
const HERO_HORIZONTAL_PADDING = 16;
const HERO_IMAGE_RADIUS = 12;
const LANDMARK_MODAL_BACKDROP_OPACITY = 0.72;
const SHEET_TOP_PEEK = 48;
const SHEET_BOTTOM_PADDING = 72;
const LAYOUT_SAFETY_BUFFER = 12;
const HERO_PADDING_BOTTOM = 4;
const WIKIMEDIA_HEADERS = {
  "User-Agent": "WorldLoop/1.0 (Expo; country discovery app)",
};

/** Conservative fallback until below-hero chrome is measured on layout. */
function estimateFallbackMaxHeroHeight(
  screenHeight: number,
  bottomInset: number,
): number {
  return Math.max(
    0,
    screenHeight -
      SHEET_TOP_PEEK -
      360 -
      SHEET_BOTTOM_PADDING -
      bottomInset -
      LAYOUT_SAFETY_BUFFER,
  );
}

function landmarkImageSource(uri: string) {
  return {
    uri,
    headers: uri.includes("wikimedia.org") ? WIKIMEDIA_HEADERS : undefined,
  };
}

function resolveHeroHeight(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  maxHeight: number,
): number {
  if (!Number.isFinite(maxHeight) || maxHeight <= 0) {
    return HERO_HEIGHT_LANDSCAPE;
  }

  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    imageHeight <= imageWidth
  ) {
    return Math.min(HERO_HEIGHT_LANDSCAPE, maxHeight);
  }

  const proportionalHeight = Math.round(
    containerWidth * (imageHeight / imageWidth),
  );
  const portraitTarget = Math.max(HERO_HEIGHT_LANDSCAPE, proportionalHeight);

  return Math.min(maxHeight, HERO_HEIGHT_PORTRAIT_MAX, portraitTarget);
}

type LandmarkHeroImageProps = {
  imageUrl: string | null;
  name: string;
  onImageDimensions?: (width: number, height: number) => void;
  onImageFailed?: () => void;
};

function LandmarkHeroImage({
  imageUrl,
  name,
  onImageDimensions,
  onImageFailed,
}: LandmarkHeroImageProps) {
  const normalizedUri = useMemo(
    () => (imageUrl ? normalizeImageUrl(imageUrl) : null),
    [imageUrl],
  );
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!normalizedUri) {
      setFailed(true);
      setLoaded(false);
      onImageFailed?.();
      return;
    }

    setFailed(false);
    setLoaded(false);
    void prefetchCountryImage(normalizedUri);
  }, [normalizedUri, onImageFailed]);

  if (!normalizedUri || failed) {
    return (
      <Image
        source={appImages.earthTopography}
        style={styles.heroPlaceholder}
        contentFit="cover"
        accessibilityLabel={`${name} placeholder`}
      />
    );
  }

  return (
    <View style={styles.heroImageStack}>
      {!loaded ? <View style={styles.heroLoadingBackdrop} /> : null}
      <Image
        source={landmarkImageSource(normalizedUri)}
        style={[styles.heroImage, !loaded && styles.heroImageHidden]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={normalizedUri}
        accessibilityLabel={name}
        onError={() => {
          setFailed(true);
          setLoaded(false);
          onImageFailed?.();
        }}
        onLoad={(event) => {
          const { width, height } = event.source;
          if (width > 0 && height > 0) {
            if (imageUrl) {
              cacheLandmarkImageDimensions(imageUrl, width, height);
            }
            onImageDimensions?.(width, height);
          }
          setLoaded(true);
        }}
      />
    </View>
  );
}

type LandmarkDetailModalProps = {
  visible: boolean;
  landmark: CountryLandmark | null;
  country: Country;
  onClose: () => void;
};

export function LandmarkDetailModal({
  visible,
  landmark,
  country,
  onClose,
}: LandmarkDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const heroContainerWidth = screenWidth - HERO_HORIZONTAL_PADDING * 2;
  const sheetMaxHeight = screenHeight - SHEET_TOP_PEEK;
  const [handleHeight, setHandleHeight] = useState(20);
  const [belowHeroHeight, setBelowHeroHeight] = useState(0);
  const maxHeroHeight = useMemo(() => {
    if (belowHeroHeight <= 0) {
      return estimateFallbackMaxHeroHeight(screenHeight, insets.bottom);
    }

    const available =
      screenHeight -
      SHEET_TOP_PEEK -
      handleHeight -
      HERO_PADDING_BOTTOM -
      belowHeroHeight -
      insets.bottom -
      LAYOUT_SAFETY_BUFFER;

    return Math.max(0, available);
  }, [belowHeroHeight, handleHeight, insets.bottom, screenHeight]);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [committedHeroHeight, setCommittedHeroHeight] = useState<number | null>(
    null,
  );
  const sizingReady =
    belowHeroHeight > 0 &&
    (!landmark?.imageUrl || imageDimensions !== null || imageFailed);
  const heroHeight = useMemo(() => {
    const fallback = Math.min(
      HERO_HEIGHT_LANDSCAPE,
      estimateFallbackMaxHeroHeight(screenHeight, insets.bottom),
    );

    if (!sizingReady) {
      return fallback;
    }

    if (!imageDimensions) {
      return Math.min(HERO_HEIGHT_LANDSCAPE, maxHeroHeight);
    }

    return resolveHeroHeight(
      imageDimensions.width,
      imageDimensions.height,
      heroContainerWidth,
      maxHeroHeight,
    );
  }, [
    belowHeroHeight,
    imageDimensions,
    heroContainerWidth,
    insets.bottom,
    maxHeroHeight,
    screenHeight,
    sizingReady,
  ]);
  const frameHeroHeight = committedHeroHeight ?? heroHeight;
  const toggleSaved = useSavedLandmarksStore((s) => s.toggleSaved);
  const isSaved = useSavedLandmarksStore((s) =>
    landmark ? s.isSaved(landmark.id) : false,
  );
  const aiCacheRef = useRef<
    Map<string, { fact: string; city: string | null } | null>
  >(new Map());
  const [landmarkAi, setLandmarkAi] = useState<{
    fact: string;
    city: string | null;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!visible || !landmark) return;
    useRecentlyViewedStore.getState().recordLandmarkView({
      landmark,
      country,
    });
    useDiscoveryProgressStore
      .getState()
      .recordLandmarkDetailView(landmark.id, country);
  }, [visible, landmark?.id, country.name, landmark, country]);

  useEffect(() => {
    if (!visible || !landmark) {
      setLandmarkAi(null);
      setAiLoading(false);
      return;
    }

    const cacheKey = `${country.name}:${landmark.id}`;
    if (aiCacheRef.current.has(cacheKey)) {
      setLandmarkAi(aiCacheRef.current.get(cacheKey) ?? null);
      setAiLoading(false);
      return;
    }

    const staticAi = isStaticLandmarkDetailsCatalogEnabled()
      ? getStaticLandmarkAiById(landmark.id)
      : null;

    if (staticAi) {
      aiCacheRef.current.set(cacheKey, staticAi);
      setLandmarkAi(staticAi);
      setAiLoading(false);
      return;
    }

    let cancelled = false;
    setLandmarkAi(null);
    setAiLoading(true);

    void fetchLandmarkAi(country.name, landmark)
      .then((content) => {
        if (cancelled) return;
        aiCacheRef.current.set(cacheKey, content);
        setLandmarkAi(content);
      })
      .catch(() => {
        if (cancelled) return;
        aiCacheRef.current.set(cacheKey, null);
        setLandmarkAi(null);
      })
      .finally(() => {
        if (!cancelled) {
          setAiLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    landmark?.id,
    landmark?.name,
    landmark?.type,
    landmark?.description,
    landmark?.city,
    landmark?.latitude,
    landmark?.longitude,
    country.name,
  ]);

  const aiFact = landmarkAi?.fact?.trim() ?? "";

  useEffect(() => {
    if (!visible) return;

    setImageFailed(false);
    setBelowHeroHeight(0);
    setHandleHeight(20);
    setCommittedHeroHeight(null);
    setImageDimensions(
      landmark?.imageUrl
        ? getCachedLandmarkImageDimensions(landmark.imageUrl)
        : null,
    );
  }, [visible, landmark?.id, landmark?.imageUrl]);

  useEffect(() => {
    if (!visible) return;
    if (sizingReady && committedHeroHeight === null) {
      setCommittedHeroHeight(heroHeight);
    }
  }, [visible, sizingReady, heroHeight, committedHeroHeight]);

  if (!landmark) return null;

  const handleHeroImageDimensions = (width: number, height: number) => {
    if (
      imageDimensions?.width === width &&
      imageDimensions?.height === height
    ) {
      return;
    }

    setImageDimensions({ width, height });
  };

  const handleHeroImageFailed = () => {
    setImageFailed(true);
  };

  const typeLabel = formatLandmarkTypeDisplay(landmark.type);
  const inferredCity =
    !landmark.city?.trim() && !landmarkAi?.city?.trim()
      ? inferLandmarkCityFromTextSources(
          [landmark.description, aiFact || null],
          country.name,
        )
      : null;
  const resolvedCity =
    landmark.city?.trim() || landmarkAi?.city?.trim() || inferredCity || null;
  const cityLabel = formatLandmarkCity(resolvedCity);
  const descriptionFallback = landmark.description?.trim()
    ? formatLandmarkDescription(landmark.description)
    : "";
  const factBodyText = aiFact || descriptionFallback;
  const showFactSection = aiLoading || factBodyText.length > 0;
  const factLoadingLabel = "Generating fact…";
  const showUnescoHeritage = isLandmarkUnesco(landmark);

  const handleToggleSaved = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSaved({ landmark, country });
  };

  const handleViewOnMap = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    openLandmarkOnMap(landmark, country);
  };

  return (
    <SwipeDismissSheet
      visible={visible}
      onClose={onClose}
      enterReady={sizingReady}
      sheetStyle={[
        styles.sheet,
        {
          maxHeight: sheetMaxHeight,
          paddingBottom: insets.bottom,
          marginBottom: -insets.bottom,
        },
      ]}
      backdropMaxOpacity={LANDMARK_MODAL_BACKDROP_OPACITY}
      backdropAccessibilityLabel="Close landmark details"
      accessibilityLabel={`${landmark.name} details`}
      accessibilityHint="Swipe down to close"
    >
      <View
        style={styles.handleWrap}
        onLayout={(event) => {
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          if (nextHeight > 0) {
            setHandleHeight((current) =>
              current === nextHeight ? current : nextHeight,
            );
          }
        }}
      >
        <View style={styles.handleBar} />
      </View>

      <View style={styles.heroPadding}>
        <View style={[styles.heroFrame, { height: frameHeroHeight }]}>
          <LandmarkHeroImage
            imageUrl={landmark.imageUrl}
            name={landmark.name}
            onImageDimensions={handleHeroImageDimensions}
            onImageFailed={handleHeroImageFailed}
          />
          <View style={styles.heroScrim} />
        </View>
      </View>

      <View
        onLayout={(event) => {
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          if (nextHeight > 0) {
            setBelowHeroHeight((current) =>
              current === nextHeight ? current : nextHeight,
            );
          }
        }}
      >
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{landmark.name}</Text>
              {showUnescoHeritage ? (
                <Text style={styles.unescoSubtitle} numberOfLines={2}>
                  {formatLandmarkHeritageDisplay()}
                </Text>
              ) : null}
            </View>

            <View style={styles.titleActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${landmark.name} on map`}
                accessibilityHint="Opens the world map focused on this landmark"
                hitSlop={8}
                onPress={handleViewOnMap}
                style={({ pressed }) => [
                  styles.titleActionButton,
                  styles.titleActionButtonLeading,
                  pressed && styles.titleActionButtonPressed,
                ]}
              >
                <Ionicons
                  name="globe-outline"
                  size={EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE}
                  color={EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR}
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isSaved ? `Unsave ${landmark.name}` : `Save ${landmark.name}`
                }
                hitSlop={8}
                onPress={handleToggleSaved}
                style={({ pressed }) => [
                  styles.titleActionButton,
                  styles.titleActionButtonTrailing,
                  pressed && styles.titleActionButtonPressed,
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
          </View>

          <View style={styles.statsPanel}>
            <View style={styles.statsRow}>
              <StatItem tile align="start" label="Type" value={typeLabel} />
              <Divider vertical />
              <StatItem tile align="start" label="City" value={cityLabel} />
            </View>
          </View>

          {showFactSection ? (
            <View style={styles.factSection}>
              <Text style={styles.factLabel}>Did you know</Text>
              {aiLoading && !factBodyText ? (
                <View style={styles.factLoadingRow}>
                  <ActivityIndicator
                    size="small"
                    color={EXPLORE_SWIPE_CARD_FACT_TEXT_COLOR}
                  />
                  <Text style={styles.factLoadingText}>{factLoadingLabel}</Text>
                </View>
              ) : (
                <Text style={styles.factText}>{factBodyText}</Text>
              )}
            </View>
          ) : null}
        </View>
        <View style={styles.bottomSpacer} />
      </View>
    </SwipeDismissSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  heroPadding: {
    paddingHorizontal: HERO_HORIZONTAL_PADDING,
    paddingBottom: HERO_PADDING_BOTTOM,
  },
  heroFrame: {
    width: "100%",
    borderRadius: HERO_IMAGE_RADIUS,
    overflow: "hidden",
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
  },
  heroImageStack: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageHidden: {
    opacity: 0,
  },
  heroLoadingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
  body: {
    paddingHorizontal: HERO_HORIZONTAL_PADDING,
    paddingTop: 14,
    gap: 14,
    flexShrink: 0,
  },
  bottomSpacer: {
    height: SHEET_BOTTOM_PADDING,
    flexShrink: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    lineHeight: 24,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  unescoSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 18,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
  titleActions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: EXPLORE_SWIPE_CARD_INFO_TITLE_ACTION_GAP,
  },
  titleActionButton: {
    width: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    height: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    justifyContent: "center",
    flexShrink: 0,
  },
  titleActionButtonLeading: {
    alignItems: "flex-end",
    marginRight: -EXPLORE_SWIPE_CARD_TITLE_ACTIONS_OVERLAP,
  },
  titleActionButtonTrailing: {
    alignItems: "flex-end",
  },
  titleActionButtonPressed: {
    opacity: 0.78,
  },
  statsPanel: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
    gap: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  factSection: {
    alignSelf: "stretch",
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
  factLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  factLoadingText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: EXPLORE_SWIPE_CARD_FACT_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
});
