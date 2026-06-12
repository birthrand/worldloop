import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  EXPLORE_FLOATING_CHROME_OFFSET,
  TAB_BAR_CONTENT_HEIGHT,
} from "@/components/bottom-tab-bar";
import {
  COMPACT_TOUCH_SIZE,
  GlassIconButton,
} from "@/components/explore/glass-icon-button";
import {
  CULTURE_CHROME_ICON_SIZE,
  CULTURE_CHROME_RAIL_GAP,
} from "@/constants/culture-chrome";
import {
  EXPLORE_FEED_RAIL_HORIZONTAL_PADDING,
  EXPLORE_FEED_SURFACE_RADIUS,
} from "@/constants/explore-feed-layout";
import { openCountryInCulture } from "@/features/navigation/open-country-in-culture";
import { hasCultureVideo } from "@/lib/format-country";
import { focusCountryOnMap } from "@/lib/open-country-on-map";
import {
  DEFAULT_FEED_SORT_FIELD,
  DEFAULT_FEED_SORT_ORDER,
  useCountryFeedStore,
  type FeedSortField,
  type FeedSortOrder,
} from "@/store/use-country-feed-store";
import { useCultureFeedStore } from "@/store/use-culture-feed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

type ExploreActionRailProps = {
  country: Country;
  /** `header` = horizontal icons beside the country name. */
  variant?: "header" | "overlay" | "culture";
  /** Clearance above the tab bar when `variant` is `overlay` or `culture`. */
  floatingChromeOffset?: number;
};

const SHEET_ENTER = SlideInDown.springify()
  .damping(20)
  .stiffness(150)
  .mass(0.85);

/** Header rail: compact touch target + vertical padding (4 + 4). */
const RAIL_HEADER_VERTICAL_PADDING = 8;
const RAIL_HEADER_ICON_GAP = 6;
const RAIL_HEADER_BORDER_RADIUS = EXPLORE_FEED_SURFACE_RADIUS;
const RAIL_SURFACE_BLUR_INTENSITY = 32;
const RAIL_SURFACE_TINT = "rgba(11, 19, 43, 0.38)";
const RAIL_SURFACE_WEB_FALLBACK = "rgba(5, 10, 24, 0.68)";
const RAIL_TOOLBAR_FILL = "rgba(255, 255, 255, 0.065)";
const RAIL_TOOLBAR_HIGHLIGHT = "rgba(255, 255, 255, 0.09)";
const RAIL_DIVIDER_COLOR = "rgba(255, 255, 255, 0.1)";
const RAIL_TOOLBAR_DIVIDER_COLOR = "rgba(255, 255, 255, 0.14)";

type RailFrostedSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `toolbar` = raised control strip on the opaque info card; `frosted` = hero overlay pill. */
  surface?: "frosted" | "toolbar";
};

function RailFrostedSurface({
  children,
  style,
  surface = "frosted",
}: RailFrostedSurfaceProps) {
  const isToolbar = surface === "toolbar";

  return (
    <View
      style={[
        styles.railFrostedShell,
        isToolbar ? styles.railToolbarShell : null,
        style,
      ]}
    >
      {isToolbar ? (
        <>
          <View style={styles.railToolbarFill} />
          <View style={styles.railToolbarHighlight} />
        </>
      ) : Platform.OS === "web" ? (
        <View style={styles.railFrostedWebFallback} />
      ) : (
        <BlurView
          intensity={RAIL_SURFACE_BLUR_INTENSITY}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      {!isToolbar ? <View style={styles.railFrostedTint} /> : null}
      {children}
    </View>
  );
}

function RailIconDivider({
  vertical = true,
  tone = "frosted",
}: {
  vertical?: boolean;
  tone?: "frosted" | "toolbar";
}) {
  const dividerColor =
    tone === "toolbar" ? RAIL_TOOLBAR_DIVIDER_COLOR : RAIL_DIVIDER_COLOR;

  return (
    <View
      style={[
        vertical
          ? styles.railIconDividerVertical
          : styles.railIconDividerHorizontal,
        { backgroundColor: dividerColor },
      ]}
      accessibilityElementsHidden
    />
  );
}

function getOrderLabels(field: FeedSortField): { asc: string; desc: string } {
  if (field === "population") {
    return { asc: "Low → High", desc: "High → Low" };
  }
  return { asc: "A → Z", desc: "Z → A" };
}

function getSortSummary(
  field: FeedSortField,
  order: FeedSortOrder,
): string | null {
  if (order === "random") return null;
  const orderLabel = getOrderLabels(field)[order];
  const fieldLabel = field === "population" ? "Population" : "Name";
  return `${fieldLabel} · ${orderLabel}`;
}

type SortRadioOptionProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function SortRadioOption({
  label,
  selected,
  disabled = false,
  onPress,
}: SortRadioOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.radioRow,
        disabled && styles.radioRowDisabled,
        pressed && !disabled && styles.optionPressed,
      ]}
    >
      <View
        style={[
          styles.radioOuter,
          selected && !disabled && styles.radioOuterSelected,
          disabled && styles.radioOuterDisabled,
        ]}
      >
        {selected && !disabled ? <View style={styles.radioInner} /> : null}
      </View>
      <Text
        style={[
          styles.radioLabel,
          selected && !disabled && styles.radioLabelSelected,
          disabled && styles.radioLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type SortCheckboxOptionProps = {
  label: string;
  checked: boolean;
  onPress: () => void;
};

function SortCheckboxOption({
  label,
  checked,
  onPress,
}: SortCheckboxOptionProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.radioRow,
        pressed && styles.optionPressed,
      ]}
    >
      <View
        style={[styles.checkboxOuter, checked && styles.checkboxOuterChecked]}
      >
        {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
      </View>
      <Text style={[styles.radioLabel, checked && styles.radioLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

type MoreMenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  disabled?: boolean;
  active?: boolean;
  onPress: () => void;
};

function MoreMenuRow({
  icon,
  label,
  subtitle,
  disabled = false,
  active = false,
  onPress,
}: MoreMenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        disabled && styles.menuRowDisabled,
        pressed && !disabled && styles.optionPressed,
      ]}
    >
      <View
        style={[
          styles.menuIconWrap,
          active && !disabled && styles.menuIconWrapActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            disabled
              ? "rgba(255, 255, 255, 0.35)"
              : active
                ? "#fbbf24"
                : "#ffffff"
          }
        />
      </View>
      <View style={styles.menuTextGroup}>
        <Text
          style={[
            styles.menuLabel,
            disabled && styles.menuLabelDisabled,
            active && !disabled && styles.menuLabelActive,
          ]}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.menuSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {!disabled ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color="rgba(255, 255, 255, 0.35)"
        />
      ) : null}
    </Pressable>
  );
}

export function ExploreActionRail({
  country,
  variant = "overlay",
  floatingChromeOffset = EXPLORE_FLOATING_CHROME_OFFSET,
}: ExploreActionRailProps) {
  const insets = useSafeAreaInsets();
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));
  const exploreSortField = useCountryFeedStore((s) => s.sortField);
  const exploreSortOrder = useCountryFeedStore((s) => s.sortOrder);
  const setExploreSort = useCountryFeedStore((s) => s.setSort);
  const cultureSortField = useCultureFeedStore((s) => s.sortField);
  const cultureSortOrder = useCultureFeedStore((s) => s.sortOrder);
  const setCultureSort = useCultureFeedStore((s) => s.setSort);
  const cultureIsMuted = useCultureFeedStore((s) => s.isMuted);
  const toggleCultureMuted = useCultureFeedStore((s) => s.toggleMuted);
  const cultureSortSheetOpen = useCultureFeedStore((s) => s.isSortSheetOpen);
  const openCultureSortSheet = useCultureFeedStore((s) => s.openSortSheet);
  const closeCultureSortSheet = useCultureFeedStore((s) => s.closeSortSheet);
  const usesCultureFeed = variant === "culture";
  const sortField = usesCultureFeed ? cultureSortField : exploreSortField;
  const sortOrder = usesCultureFeed ? cultureSortOrder : exploreSortOrder;
  const setSort = usesCultureFeed ? setCultureSort : setExploreSort;
  const saved = isSaved;
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isExploreSortModalOpen, setIsExploreSortModalOpen] = useState(false);
  const isSortModalOpen = usesCultureFeed
    ? cultureSortSheetOpen
    : isExploreSortModalOpen;
  const [draftRandom, setDraftRandom] = useState(false);
  const [draftField, setDraftField] = useState<FeedSortField>(
    sortField ?? DEFAULT_FEED_SORT_FIELD,
  );
  const [draftOrder, setDraftOrder] = useState<FeedSortOrder>(
    sortOrder ?? DEFAULT_FEED_SORT_ORDER,
  );
  const currentField = sortField ?? DEFAULT_FEED_SORT_FIELD;
  const currentOrder = sortOrder ?? DEFAULT_FEED_SORT_ORDER;
  const sortOptionsDisabled = draftRandom;
  const hasSortChanges =
    (currentOrder === "random") !== draftRandom ||
    (!draftRandom &&
      (draftField !== currentField || draftOrder !== currentOrder));
  const hasCustomSort =
    currentField !== DEFAULT_FEED_SORT_FIELD ||
    currentOrder !== DEFAULT_FEED_SORT_ORDER;
  const orderLabels = getOrderLabels(draftField);
  const currentSortSummary = getSortSummary(currentField, currentOrder);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Discover ${country.name} on WorldLoop!`,
      });
    } catch {
      Alert.alert("Share", "Unable to share right now.");
    }
  };

  const handleOpenMoreMenu = () => {
    setIsMoreMenuOpen(true);
  };

  const handleCloseMoreMenu = () => {
    setIsMoreMenuOpen(false);
  };

  const handleOpenSortModal = () => {
    const random = currentOrder === "random";
    setDraftField(currentField);
    setDraftRandom(random);
    setDraftOrder(random ? "asc" : currentOrder);
    setIsMoreMenuOpen(false);
    if (usesCultureFeed) {
      openCultureSortSheet();
      return;
    }
    setIsExploreSortModalOpen(true);
  };

  const handleCloseSortModal = () => {
    if (usesCultureFeed) {
      closeCultureSortSheet();
      return;
    }
    setIsExploreSortModalOpen(false);
  };

  const handleApplySort = () => {
    setSort(draftField, draftRandom ? "random" : draftOrder);
    if (usesCultureFeed) {
      closeCultureSortSheet();
      return;
    }
    setIsExploreSortModalOpen(false);
  };

  const handleJumpToMap = () => {
    setIsMoreMenuOpen(false);
    focusCountryOnMap(country, "explore");
    router.push("/(tabs)/map");
  };

  const handleShareFromMenu = () => {
    setIsMoreMenuOpen(false);
    void handleShare();
  };

  const handleToggleSaved = () => {
    toggleSaved(country);
  };

  const handleOpenCultureVideo = () => {
    openCountryInCulture(country);
  };

  const hasVideo = hasCultureVideo(country);

  return (
    <>
      <View
        style={
          variant === "header"
            ? styles.railHeaderStack
            : [
                variant === "culture"
                  ? styles.railCultureOverlay
                  : styles.railOverlay,
                {
                  bottom:
                    insets.bottom +
                    TAB_BAR_CONTENT_HEIGHT +
                    floatingChromeOffset,
                },
              ]
        }
        pointerEvents="box-none"
        accessibilityLabel="Country actions"
      >
        {variant === "header" ? (
          <RailFrostedSurface surface="toolbar" style={styles.railHeader}>
            <GlassIconButton
              icon="globe-outline"
              label="Map"
              variant="compact"
              iconTone="bright"
              onPress={handleJumpToMap}
              accessibilityLabel={`View ${country.name} on map`}
              accessibilityHint="Opens the world map focused on this country"
            />

            <RailIconDivider tone="toolbar" />

            <GlassIconButton
              icon="film-outline"
              label="Culture"
              variant="compact"
              iconTone="bright"
              disabled={!hasVideo}
              onPress={handleOpenCultureVideo}
              accessibilityLabel={
                hasVideo
                  ? `Watch culture video for ${country.name}`
                  : `No culture video for ${country.name}`
              }
              accessibilityHint={
                hasVideo
                  ? "Opens the Culture tab with this country's video clip"
                  : "This country does not have a culture video yet"
              }
            />

            <RailIconDivider tone="toolbar" />

            <GlassIconButton
              icon={saved ? "bookmark" : "bookmark-outline"}
              label="Save"
              variant="compact"
              iconTone="bright"
              active={saved}
              haptic="medium"
              onPress={handleToggleSaved}
              accessibilityLabel={
                saved ? `Unsave ${country.name}` : `Save ${country.name}`
              }
              accessibilityHint={
                saved
                  ? "Removes this country from your saved list"
                  : "Adds this country to your saved list"
              }
            />
          </RailFrostedSurface>
        ) : variant === "culture" ? (
          <View style={styles.railCultureStack}>
            <GlassIconButton
              icon="globe-outline"
              label="Map"
              variant="plain"
              showLabel
              iconTone="bright"
              iconSize={CULTURE_CHROME_ICON_SIZE}
              onPress={handleJumpToMap}
              accessibilityLabel={`View ${country.name} on map`}
              accessibilityHint="Opens the world map focused on this country"
            />

            <GlassIconButton
              icon={saved ? "bookmark" : "bookmark-outline"}
              label="Save"
              variant="plain"
              showLabel
              iconTone="bright"
              iconSize={CULTURE_CHROME_ICON_SIZE}
              active={saved}
              haptic="medium"
              onPress={handleToggleSaved}
              accessibilityLabel={
                saved ? `Unsave ${country.name}` : `Save ${country.name}`
              }
              accessibilityHint={
                saved
                  ? "Removes this country from your saved list"
                  : "Adds this country to your saved list"
              }
            />

            <GlassIconButton
              icon="share-social-outline"
              label="Share"
              variant="plain"
              showLabel
              iconTone="bright"
              iconSize={CULTURE_CHROME_ICON_SIZE}
              onPress={() => {
                void handleShare();
              }}
              accessibilityLabel={`Share ${country.name}`}
              accessibilityHint="Opens the system share sheet"
            />

            <GlassIconButton
              icon="swap-vertical-outline"
              label="Sort"
              variant="plain"
              showLabel
              iconTone="bright"
              iconSize={CULTURE_CHROME_ICON_SIZE}
              active={hasCustomSort}
              onPress={handleOpenSortModal}
              accessibilityLabel="Sort culture feed"
              accessibilityHint="Opens sort options for the culture feed"
            />

            <GlassIconButton
              icon={
                cultureIsMuted ? "volume-mute-outline" : "volume-high-outline"
              }
              label={cultureIsMuted ? "Muted" : "Sound"}
              variant="plain"
              showLabel
              iconTone="bright"
              iconSize={CULTURE_CHROME_ICON_SIZE}
              active={!cultureIsMuted}
              onPress={toggleCultureMuted}
              accessibilityLabel={
                cultureIsMuted ? "Unmute culture videos" : "Mute culture videos"
              }
              accessibilityHint="Toggles sound on the culture video feed"
            />
          </View>
        ) : (
          <RailFrostedSurface style={styles.railGroup}>
            <GlassIconButton
              icon="globe-outline"
              label="Map"
              variant="compact"
              onPress={handleJumpToMap}
              accessibilityLabel={`View ${country.name} on map`}
              accessibilityHint="Opens the world map focused on this country"
            />

            <GlassIconButton
              icon={saved ? "bookmark" : "bookmark-outline"}
              label="Save"
              variant="compact"
              active={saved}
              haptic="medium"
              onPress={handleToggleSaved}
              accessibilityLabel={
                saved ? `Unsave ${country.name}` : `Save ${country.name}`
              }
              accessibilityHint={
                saved
                  ? "Removes this country from your saved list"
                  : "Adds this country to your saved list"
              }
            />

            <GlassIconButton
              icon="ellipsis-horizontal"
              label="More"
              variant="compact"
              active={hasCustomSort}
              onPress={handleOpenMoreMenu}
              accessibilityLabel="More actions"
              accessibilityHint="Opens share, sort, and other country actions"
            />
          </RailFrostedSurface>
        )}
      </View>

      {variant === "overlay" ? (
        <Modal
          visible={isMoreMenuOpen}
          animationType="fade"
          transparent
          onRequestClose={handleCloseMoreMenu}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Close more actions"
              onPress={handleCloseMoreMenu}
            />
            <Animated.View
              entering={SHEET_ENTER}
              style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
              accessibilityViewIsModal
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>More actions</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close more actions"
                  hitSlop={10}
                  onPress={handleCloseMoreMenu}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color="rgba(255, 255, 255, 0.45)"
                  />
                </Pressable>
              </View>

              <View style={styles.menuPanel}>
                <MoreMenuRow
                  icon="share-social-outline"
                  label="Share"
                  subtitle={`Share ${country.name} with friends`}
                  onPress={handleShareFromMenu}
                />
                <View style={styles.menuDivider} />
                <MoreMenuRow
                  icon="swap-vertical-outline"
                  label="Sort feed"
                  subtitle={currentSortSummary ?? "Shuffled order"}
                  active={hasCustomSort}
                  onPress={handleOpenSortModal}
                />
                <View style={styles.menuDivider} />
                <MoreMenuRow
                  icon="volume-medium-outline"
                  label="Listen"
                  subtitle="Narration coming soon"
                  disabled
                  onPress={() => {}}
                />
              </View>
            </Animated.View>
          </View>
        </Modal>
      ) : null}

      {variant !== "header" ? (
        <Modal
          visible={isSortModalOpen}
          animationType="fade"
          transparent
          onRequestClose={handleCloseSortModal}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Close sort options"
              onPress={handleCloseSortModal}
            />
            <Animated.View
              entering={SHEET_ENTER}
              style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
              accessibilityViewIsModal
            >
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleGroup}>
                  <Text style={styles.sheetTitle}>Sort feed</Text>
                  {currentSortSummary ? (
                    <Text style={styles.sheetSubtitle}>
                      {currentSortSummary}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close sort options"
                  hitSlop={10}
                  onPress={handleCloseSortModal}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color="rgba(255, 255, 255, 0.45)"
                  />
                </Pressable>
              </View>

              <View style={styles.tabPanel}>
                <Text style={styles.sectionLabel}>Shuffle</Text>
                <SortCheckboxOption
                  label="Random order"
                  checked={draftRandom}
                  onPress={() => setDraftRandom((prev) => !prev)}
                />

                <View style={styles.sectionDivider} />

                <Text style={styles.sectionLabel}>Sort by</Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Sort by"
                  style={styles.radioGroup}
                >
                  <SortRadioOption
                    label="Name"
                    selected={draftField === "name"}
                    disabled={sortOptionsDisabled}
                    onPress={() => setDraftField("name")}
                  />
                  <SortRadioOption
                    label="Population"
                    selected={draftField === "population"}
                    disabled={sortOptionsDisabled}
                    onPress={() => setDraftField("population")}
                  />
                </View>

                <View style={styles.sectionDivider} />

                <Text style={styles.sectionLabel}>Order</Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Order"
                  style={styles.radioGroup}
                >
                  <SortRadioOption
                    label={orderLabels.asc}
                    selected={draftOrder === "asc"}
                    disabled={sortOptionsDisabled}
                    onPress={() => setDraftOrder("asc")}
                  />
                  <SortRadioOption
                    label={orderLabels.desc}
                    selected={draftOrder === "desc"}
                    disabled={sortOptionsDisabled}
                    onPress={() => setDraftOrder("desc")}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel sort changes"
                  onPress={handleCloseSortModal}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.cancelButton,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={!hasSortChanges}
                  accessibilityRole="button"
                  accessibilityLabel="Apply sort changes"
                  accessibilityState={{ disabled: !hasSortChanges }}
                  onPress={handleApplySort}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.applyButton,
                    !hasSortChanges && styles.applyButtonDisabled,
                    pressed && hasSortChanges && styles.optionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.applyText,
                      !hasSortChanges && styles.applyTextDisabled,
                    ]}
                  >
                    Apply
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  railOverlay: {
    position: "absolute",
    right: 10,
    alignItems: "center",
    zIndex: 10,
  },
  railCultureOverlay: {
    position: "absolute",
    right: 12,
    alignItems: "center",
    zIndex: 10,
  },
  railCultureStack: {
    alignItems: "center",
    gap: CULTURE_CHROME_RAIL_GAP,
  },
  railHeaderStack: {
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: 4,
  },
  railHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: RAIL_HEADER_ICON_GAP,
    paddingVertical: RAIL_HEADER_VERTICAL_PADDING / 2,
    paddingHorizontal: EXPLORE_FEED_RAIL_HORIZONTAL_PADDING,
    borderRadius: RAIL_HEADER_BORDER_RADIUS,
    overflow: "hidden",
  },
  railFrostedShell: {
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  railToolbarShell: {
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.42,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  railToolbarFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RAIL_TOOLBAR_FILL,
  },
  railToolbarHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: RAIL_TOOLBAR_HIGHLIGHT,
  },
  railFrostedWebFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RAIL_SURFACE_WEB_FALLBACK,
  },
  railFrostedTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RAIL_SURFACE_TINT,
  },
  railIconDividerVertical: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: RAIL_DIVIDER_COLOR,
    flexShrink: 0,
  },
  railIconDividerHorizontal: {
    width: 20,
    height: StyleSheet.hairlineWidth,
    backgroundColor: RAIL_DIVIDER_COLOR,
    flexShrink: 0,
  },
  railGroup: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: (COMPACT_TOUCH_SIZE + 8) / 2,
    overflow: "hidden",
  },
  optionPressed: {
    opacity: 0.78,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255, 255, 255, 0.14)",
    gap: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  sheetTitleGroup: {
    flex: 1,
    gap: 1,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  sheetSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.55)",
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  menuPanel: {
    gap: 0,
    marginTop: 4,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 6,
  },
  menuRowDisabled: {
    opacity: 0.55,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  menuIconWrapActive: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
  },
  menuTextGroup: {
    flex: 1,
    gap: 1,
  },
  menuLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  menuLabelActive: {
    color: "#fbbf24",
  },
  menuLabelDisabled: {
    color: "rgba(255, 255, 255, 0.55)",
  },
  menuSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.5)",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  tabPanel: {
    gap: 0,
  },
  sectionLabel: {
    marginTop: 2,
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "left",
    alignSelf: "flex-start",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 6,
  },
  radioGroup: {
    gap: 0,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    paddingVertical: 0,
  },
  radioRowDisabled: {
    opacity: 0.4,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#fbbf24",
  },
  radioOuterDisabled: {
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fbbf24",
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOuterChecked: {
    borderColor: "#fbbf24",
    backgroundColor: "#fbbf24",
  },
  checkboxMark: {
    fontSize: 12,
    lineHeight: 14,
    fontFamily: "Poppins-Bold",
    color: "#0b132b",
    marginTop: -1,
  },
  radioLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.72)",
  },
  radioLabelSelected: {
    color: "#ffffff",
    fontFamily: "Poppins-SemiBold",
  },
  radioLabelDisabled: {
    color: "rgba(255, 255, 255, 0.35)",
  },
  modalActions: {
    marginTop: 4,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  applyButton: {
    backgroundColor: "#fbbf24",
  },
  applyButtonDisabled: {
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  cancelText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  applyText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
  applyTextDisabled: {
    color: "rgba(255, 255, 255, 0.65)",
  },
});
