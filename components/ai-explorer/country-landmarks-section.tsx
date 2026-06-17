import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { LandmarkDetailModal } from "@/components/ai-explorer/landmark-detail-modal";
import { ProfileSection } from "@/components/ai-explorer/profile-section";
import { prefetchCountryImage } from "@/components/explore/country-image";
import { COUNTRY_DETAIL_MODULE_BG } from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
  EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR,
  EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
} from "@/constants/explore-swipe-layout";
import { images as appImages } from "@/constants/images";
import type { CountryLandmark } from "@/lib/api";
import { prefetchLandmarkImageDimensions } from "@/lib/landmark-image-dimensions";
import { normalizeImageUrl } from "@/lib/normalize-image-url";
import { useSavedLandmarksStore } from "@/store/use-saved-landmarks-store";
import type { Country } from "@/types/country";

const IMAGE_CROSSFADE_MS = 320;
const PREVIEW_WIDTH = 48;
const PREVIEW_BLUR_RADIUS = 18;
const LANDMARK_FOCUS_PULSE_MS = 280;
const GRID_COLUMNS = 2;
const GRID_COLLAPSED_COUNT = GRID_COLUMNS * 2;
const GRID_CARD_GAP = 12;
const GRID_IMAGE_HEIGHT = 112;
const BOOKMARK_ICON_INSET =
  (EXPLORE_SWIPE_ACTION_BUTTON_SIZE - EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE) / 2;
const WIKIMEDIA_HEADERS = {
  "User-Agent": "WorldLoop/1.0 (Expo; country discovery app)",
};

type LandmarksSectionLayout = "grid" | "list";

function getGridCardWidth(containerWidth: number): number {
  return (containerWidth - GRID_CARD_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
}

function chunkLandmarks<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

type LandmarksLayoutToggleProps = {
  layout: LandmarksSectionLayout;
  onLayoutChange: (layout: LandmarksSectionLayout) => void;
};

function LandmarksLayoutToggle({
  layout,
  onLayoutChange,
}: LandmarksLayoutToggleProps) {
  return (
    <View style={styles.layoutToggleRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: layout === "grid" }}
        accessibilityLabel="Grid view"
        hitSlop={4}
        onPress={() => onLayoutChange("grid")}
        style={({ pressed }) => [
          styles.layoutToggleButton,
          layout === "grid" && styles.layoutToggleButtonActive,
          pressed && styles.layoutToggleButtonPressed,
        ]}
      >
        <Ionicons
          name={layout === "grid" ? "grid" : "grid-outline"}
          size={16}
          color={layout === "grid" ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)"}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: layout === "list" }}
        accessibilityLabel="List view"
        hitSlop={4}
        onPress={() => onLayoutChange("list")}
        style={({ pressed }) => [
          styles.layoutToggleButton,
          layout === "list" && styles.layoutToggleButtonActive,
          pressed && styles.layoutToggleButtonPressed,
        ]}
      >
        <Ionicons
          name={layout === "list" ? "list" : "list-outline"}
          size={16}
          color={layout === "list" ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)"}
        />
      </Pressable>
    </View>
  );
}

function landmarkImageSource(uri: string) {
  return {
    uri,
    headers: uri.includes("wikimedia.org") ? WIKIMEDIA_HEADERS : undefined,
  };
}

/** Low-quality preview URL for blurred placeholder (Wikimedia width param or thumb). */
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

type LandmarkImageProps = {
  imageUrl: string | null;
  name: string;
};

function LandmarkImage({ imageUrl, name }: LandmarkImageProps) {
  const normalizedUri = useMemo(
    () => (imageUrl ? normalizeImageUrl(imageUrl) : null),
    [imageUrl],
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

  if (!normalizedUri || failed) {
    return (
      <Image
        source={appImages.earthTopography}
        style={styles.placeholderImage}
        contentFit="cover"
        accessibilityLabel={`${name} placeholder`}
      />
    );
  }

  const previewSource = previewUri
    ? landmarkImageSource(previewUri)
    : landmarkImageSource(normalizedUri);

  return (
    <View style={styles.imageStack}>
      <Image
        source={previewSource}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        blurRadius={PREVIEW_BLUR_RADIUS}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Image
        source={landmarkImageSource(normalizedUri)}
        placeholder={previewSource}
        placeholderContentFit="cover"
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={normalizedUri}
        transition={{ duration: IMAGE_CROSSFADE_MS, effect: "cross-dissolve" }}
        accessibilityLabel={name}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

type LandmarkCardProps = {
  landmark: CountryLandmark;
  country: Country;
  highlighted?: boolean;
  scrollContentRef?: RefObject<View | null>;
  onFocusLayout?: (offsetY: number) => void;
  onPress?: () => void;
};

function measureLandmarkScrollOffset(
  cardRef: View,
  scrollContentRef: View,
  onSuccess: (offsetY: number) => void,
): void {
  cardRef.measureLayout(
    scrollContentRef,
    (_x, y) => onSuccess(y),
    () => {
      requestAnimationFrame(() => {
        cardRef.measureLayout(
          scrollContentRef,
          (_x, retryY) => onSuccess(retryY),
          () => {},
        );
      });
    },
  );
}

function LandmarkCard({
  landmark,
  country,
  highlighted = false,
  scrollContentRef,
  onFocusLayout,
  onPress,
}: LandmarkCardProps) {
  const cardRef = useRef<View>(null);
  const toggleSaved = useSavedLandmarksStore((s) => s.toggleSaved);
  const isSaved = useSavedLandmarksStore((s) => s.isSaved(landmark.id));
  const pulseScale = useSharedValue(1);
  const highlightOpacity = useSharedValue(0);
  const hasReportedFocusLayoutRef = useRef(false);

  const reportFocusPosition = () => {
    if (
      !highlighted ||
      !onFocusLayout ||
      !scrollContentRef?.current ||
      !cardRef.current ||
      hasReportedFocusLayoutRef.current
    ) {
      return;
    }

    measureLandmarkScrollOffset(
      cardRef.current,
      scrollContentRef.current,
      (offsetY) => {
        hasReportedFocusLayoutRef.current = true;
        onFocusLayout(offsetY);
      },
    );
  };

  useEffect(() => {
    if (!highlighted) {
      highlightOpacity.value = 0;
      pulseScale.value = 1;
      hasReportedFocusLayoutRef.current = false;
      return;
    }

    highlightOpacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(900, withTiming(0, { duration: 520 })),
    );
    pulseScale.value = withSequence(
      withTiming(1.025, {
        duration: LANDMARK_FOCUS_PULSE_MS,
        easing: Easing.out(Easing.ease),
      }),
      withTiming(1, {
        duration: LANDMARK_FOCUS_PULSE_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      withDelay(
        160,
        withTiming(1.015, {
          duration: 220,
          easing: Easing.out(Easing.ease),
        }),
      ),
      withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) }),
    );
  }, [highlighted, highlightOpacity, pulseScale]);

  useEffect(() => {
    if (!highlighted) return;

    requestAnimationFrame(() => {
      reportFocusPosition();
    });
  }, [highlighted, landmark.id]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const frameAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(251, 191, 36, ${highlightOpacity.value * 0.95})`,
    shadowOpacity: highlightOpacity.value * 0.45,
  }));

  const handleLayout = () => {
    reportFocusPosition();
  };

  const handleToggleSaved = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSaved({ landmark, country });
  };

  const handleOpenDetail = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <View ref={cardRef} onLayout={handleLayout}>
      <Animated.View style={cardAnimatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View details for ${landmark.name}`}
          accessibilityHint="Opens landmark details"
          onPressIn={() => prefetchLandmarkImageDimensions(landmark.imageUrl)}
          onPress={handleOpenDetail}
          style={({ pressed }) => [
            styles.imagePressable,
            pressed && styles.imagePressablePressed,
          ]}
        >
          <Animated.View style={[styles.imageFrame, frameAnimatedStyle]}>
            <LandmarkImage imageUrl={landmark.imageUrl} name={landmark.name} />
            <View style={styles.nameOverlay}>
              <View style={styles.nameRow}>
                <Text
                  style={styles.name}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {landmark.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSaved
                      ? `Unsave ${landmark.name}`
                      : `Save ${landmark.name}`
                  }
                  accessibilityHint={
                    isSaved
                      ? "Removes this landmark from your saved list"
                      : "Adds this landmark to your saved list"
                  }
                  hitSlop={8}
                  onPress={handleToggleSaved}
                  style={({ pressed }) => [
                    styles.bookmarkButton,
                    pressed && styles.bookmarkButtonPressed,
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
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

type LandmarkGridCardProps = {
  landmark: CountryLandmark;
  country: Country;
  width: number;
  highlighted?: boolean;
  scrollContentRef?: RefObject<View | null>;
  onFocusLayout?: (offsetY: number) => void;
  onPress?: () => void;
};

function LandmarkGridCard({
  landmark,
  country,
  width,
  highlighted = false,
  scrollContentRef,
  onFocusLayout,
  onPress,
}: LandmarkGridCardProps) {
  const cardRef = useRef<View>(null);
  const toggleSaved = useSavedLandmarksStore((s) => s.toggleSaved);
  const isSaved = useSavedLandmarksStore((s) => s.isSaved(landmark.id));
  const pulseScale = useSharedValue(1);
  const highlightOpacity = useSharedValue(0);
  const hasReportedFocusLayoutRef = useRef(false);

  const reportFocusPosition = () => {
    if (
      !highlighted ||
      !onFocusLayout ||
      !scrollContentRef?.current ||
      !cardRef.current ||
      hasReportedFocusLayoutRef.current
    ) {
      return;
    }

    measureLandmarkScrollOffset(
      cardRef.current,
      scrollContentRef.current,
      (offsetY) => {
        hasReportedFocusLayoutRef.current = true;
        onFocusLayout(offsetY);
      },
    );
  };

  useEffect(() => {
    if (!highlighted) {
      highlightOpacity.value = 0;
      pulseScale.value = 1;
      hasReportedFocusLayoutRef.current = false;
      return;
    }

    highlightOpacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(900, withTiming(0, { duration: 520 })),
    );
    pulseScale.value = withSequence(
      withTiming(1.025, {
        duration: LANDMARK_FOCUS_PULSE_MS,
        easing: Easing.out(Easing.ease),
      }),
      withTiming(1, {
        duration: LANDMARK_FOCUS_PULSE_MS,
        easing: Easing.inOut(Easing.ease),
      }),
    );
  }, [highlighted, highlightOpacity, pulseScale]);

  useEffect(() => {
    if (!highlighted) return;

    requestAnimationFrame(() => {
      reportFocusPosition();
    });
  }, [highlighted, landmark.id]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const frameAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(251, 191, 36, ${highlightOpacity.value * 0.95})`,
    shadowOpacity: highlightOpacity.value * 0.45,
  }));

  const handleLayout = () => {
    reportFocusPosition();
  };

  const handleToggleSaved = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSaved({ landmark, country });
  };

  const handleOpenDetail = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <View
      ref={cardRef}
      style={[styles.gridCard, { width }]}
      onLayout={handleLayout}
    >
      <Animated.View style={cardAnimatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View details for ${landmark.name}`}
          accessibilityHint="Opens landmark details"
          onPressIn={() => prefetchLandmarkImageDimensions(landmark.imageUrl)}
          onPress={handleOpenDetail}
          style={({ pressed }) => [
            styles.gridPressable,
            pressed && styles.imagePressablePressed,
          ]}
        >
          <Animated.View style={[styles.gridImageFrame, frameAnimatedStyle]}>
            <LandmarkImage imageUrl={landmark.imageUrl} name={landmark.name} />
            <View style={styles.gridNameOverlay}>
              <View style={styles.nameRow}>
                <Text
                  style={styles.gridName}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {landmark.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSaved
                      ? `Unsave ${landmark.name}`
                      : `Save ${landmark.name}`
                  }
                  hitSlop={8}
                  onPress={handleToggleSaved}
                  style={({ pressed }) => [
                    styles.bookmarkButton,
                    pressed && styles.bookmarkButtonPressed,
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
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function shouldExpandForFocus(
  landmarks: CountryLandmark[],
  focusLandmarkId: string | null | undefined,
): boolean {
  if (!focusLandmarkId) return false;
  const focusIndex = landmarks.findIndex(
    (landmark) => landmark.id === focusLandmarkId,
  );
  return focusIndex > 0;
}

type CountryLandmarksSectionProps = {
  country: Country;
  landmarks: CountryLandmark[];
  focusLandmarkId?: string | null;
  scrollContentRef?: RefObject<View | null>;
  onFocusLandmarkPosition?: (offsetY: number) => void;
};

export function CountryLandmarksSection({
  country,
  landmarks,
  focusLandmarkId = null,
  scrollContentRef,
  onFocusLandmarkPosition,
}: CountryLandmarksSectionProps) {
  const landmarkKey = landmarks.map((landmark) => landmark.id).join("|");
  const focusIndex = focusLandmarkId
    ? landmarks.findIndex((landmark) => landmark.id === focusLandmarkId)
    : -1;
  const highlightedLandmarkId = focusIndex >= 0 ? focusLandmarkId : null;
  const [expanded, setExpanded] = useState(() =>
    shouldExpandForFocus(landmarks, focusLandmarkId),
  );
  const [layout, setLayout] = useState<LandmarksSectionLayout>("list");
  const [gridContainerWidth, setGridContainerWidth] = useState(0);
  const [selectedLandmark, setSelectedLandmark] =
    useState<CountryLandmark | null>(null);
  const hasReportedSectionFocusRef = useRef(false);

  const onGridLayout = useCallback((event: LayoutChangeEvent) => {
    setGridContainerWidth(event.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    setExpanded(shouldExpandForFocus(landmarks, focusLandmarkId));
    hasReportedSectionFocusRef.current = false;
  }, [focusLandmarkId, landmarkKey, landmarks]);

  useEffect(() => {
    if (!focusLandmarkId || landmarks.length === 0) {
      return;
    }

    const focusedLandmark = landmarks.find(
      (landmark) => landmark.id === focusLandmarkId,
    );
    if (focusedLandmark) {
      setSelectedLandmark(focusedLandmark);
    }
  }, [focusLandmarkId, landmarkKey, landmarks]);

  if (landmarks.length === 0) return null;

  const isGrid = layout === "grid";
  const collapsedCount = isGrid ? GRID_COLLAPSED_COUNT : 1;
  const hasMore = landmarks.length > collapsedCount;
  const visibleLandmarks = expanded
    ? landmarks
    : landmarks.slice(0, collapsedCount);
  const hiddenCount = landmarks.length - collapsedCount;
  const gridCardWidth =
    gridContainerWidth > 0 ? getGridCardWidth(gridContainerWidth) : 0;
  const gridRows = chunkLandmarks(visibleLandmarks, GRID_COLUMNS);

  const reportFocusPosition = (offsetY: number) => {
    if (
      !highlightedLandmarkId ||
      !onFocusLandmarkPosition ||
      hasReportedSectionFocusRef.current
    ) {
      return;
    }

    hasReportedSectionFocusRef.current = true;
    onFocusLandmarkPosition(offsetY);
  };

  return (
    <ProfileSection
      title="Landmarks"
      trailing={
        <LandmarksLayoutToggle layout={layout} onLayoutChange={setLayout} />
      }
    >
      <LandmarkDetailModal
        visible={selectedLandmark !== null}
        landmark={selectedLandmark}
        country={country}
        onClose={() => setSelectedLandmark(null)}
      />

      {isGrid ? (
        <View style={styles.grid} onLayout={onGridLayout}>
          {gridRows.map((row, rowIndex) => (
            <View key={`landmark-grid-row-${rowIndex}`} style={styles.gridRow}>
              {row.map((landmark) => (
                <LandmarkGridCard
                  key={landmark.id}
                  landmark={landmark}
                  country={country}
                  width={gridCardWidth}
                  highlighted={landmark.id === highlightedLandmarkId}
                  scrollContentRef={scrollContentRef}
                  onFocusLayout={
                    landmark.id === highlightedLandmarkId
                      ? reportFocusPosition
                      : undefined
                  }
                  onPress={() => setSelectedLandmark(landmark)}
                />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {visibleLandmarks.map((landmark) => (
            <LandmarkCard
              key={landmark.id}
              landmark={landmark}
              country={country}
              highlighted={landmark.id === highlightedLandmarkId}
              scrollContentRef={scrollContentRef}
              onFocusLayout={
                landmark.id === highlightedLandmarkId
                  ? reportFocusPosition
                  : undefined
              }
              onPress={() => setSelectedLandmark(landmark)}
            />
          ))}
        </View>
      )}
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded
              ? "Show fewer landmarks"
              : `Show ${hiddenCount} more landmarks`
          }
          onPress={() => setExpanded((value) => !value)}
          style={styles.toggleRow}
        >
          <Text style={styles.toggleText}>
            {expanded
              ? "Show less"
              : `Show ${hiddenCount} more landmark${hiddenCount === 1 ? "" : "s"}`}
          </Text>
        </Pressable>
      ) : null}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  layoutToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  layoutToggleButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  layoutToggleButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  layoutToggleButtonPressed: {
    opacity: 0.85,
  },
  list: {
    gap: 14,
  },
  grid: {
    gap: GRID_CARD_GAP,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_CARD_GAP,
  },
  gridCard: {
    minWidth: 0,
  },
  gridPressable: {
    borderRadius: 10,
  },
  gridImageFrame: {
    width: "100%",
    height: GRID_IMAGE_HEIGHT,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: EXPLORE_SWIPE_ACCENT_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 4,
  },
  gridNameOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  gridName: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    lineHeight: 16,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  imagePressable: {
    borderRadius: 10,
  },
  imagePressablePressed: {
    opacity: 0.92,
  },
  imageFrame: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COUNTRY_DETAIL_MODULE_BG,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: EXPLORE_SWIPE_ACCENT_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 4,
  },
  imageStack: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  nameOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: -4,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 18,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  bookmarkButton: {
    width: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    height: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: -4,
    marginRight: -BOOKMARK_ICON_INSET,
  },
  bookmarkButtonPressed: {
    opacity: 0.78,
  },
  toggleRow: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  toggleText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: EXPLORE_SWIPE_ACCENT_COLOR,
  },
});
