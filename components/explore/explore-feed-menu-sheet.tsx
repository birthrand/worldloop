import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WORLDLOOP_HEADER_ACCENT_COLOR } from "@/components/worldloop-header";
import {
  EXPLORE_SWIPE_TAB_BAR_BG,
  EXPLORE_SWIPE_TAB_BAR_BORDER,
} from "@/constants/explore-swipe-layout";
import {
  continentDisplayLabel,
  continentTabLabel,
  EXPLORE_HEADER_TABS,
  FOR_YOU_TAB,
  HERE_TAB,
  isContinent,
  SAVED_TAB,
  type ExploreHeaderTab,
} from "@/constants/regions";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";

const SHEET_ENTER = SlideInDown.springify()
  .damping(20)
  .stiffness(150)
  .mass(0.85);

const SHEET_DISMISS_DRAG_PX = 88;
const SHEET_DISMISS_VELOCITY = 900;
const SHEET_DISMISS_EXIT_PX = 420;

type ExploreFeedMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type FeedMenuRowProps = {
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

function FeedMenuRow({
  label,
  selected,
  accessibilityLabel,
  onPress,
}: FeedMenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <Text
        style={[styles.menuLabel, selected && styles.menuLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {selected ? (
        <Ionicons
          name="checkmark"
          size={18}
          color={WORLDLOOP_HEADER_ACCENT_COLOR}
        />
      ) : null}
    </Pressable>
  );
}

export function ExploreFeedMenuSheet({
  visible,
  onClose,
}: ExploreFeedMenuSheetProps) {
  const insets = useSafeAreaInsets();
  const canCloseFromBackdropRef = useRef(false);
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);

  useEffect(() => {
    if (!visible) {
      canCloseFromBackdropRef.current = false;
      cancelAnimation(translateY);
      translateY.value = 0;
      isDismissing.value = false;
      return;
    }

    cancelAnimation(translateY);
    translateY.value = 0;
    isDismissing.value = false;

    const timeout = setTimeout(() => {
      canCloseFromBackdropRef.current = true;
    }, 120);

    return () => clearTimeout(timeout);
  }, [visible, isDismissing, translateY]);

  const handleBackdropClose = () => {
    if (!canCloseFromBackdropRef.current) return;
    onClose();
  };
  const selectedRegion = useCountryFeedStore((s) => s.selectedRegion);
  const discoveryMode = useCountryFeedStore((s) => s.discoveryMode);
  const countryCount = useCountryFeedStore((s) => s.countries.length);
  const restoreForYouFeed = useCountryFeedStore((s) => s.restoreForYouFeed);
  const setRegionFilter = useCountryFeedStore((s) => s.setRegionFilter);
  const loadSavedFeed = useCountryFeedStore((s) => s.loadSavedFeed);
  const savedCount = useSavedCountriesStore((s) => s.savedCountries.length);
  const focusedRegion = useSpatialContextStore(
    (s) => s.discoveryScope.focusedRegion,
  );

  const headerTabs: ExploreHeaderTab[] =
    discoveryMode === "here"
      ? [FOR_YOU_TAB, SAVED_TAB, HERE_TAB, ...EXPLORE_HEADER_TABS.slice(1)]
      : [FOR_YOU_TAB, SAVED_TAB, ...EXPLORE_HEADER_TABS.slice(1)];

  const selectedTab: ExploreHeaderTab =
    discoveryMode === "saved"
      ? SAVED_TAB
      : discoveryMode === "here"
        ? HERE_TAB
        : selectedRegion === null
          ? FOR_YOU_TAB
          : (selectedRegion as ExploreHeaderTab);

  const hereScopeLabel = focusedRegion
    ? continentDisplayLabel(focusedRegion)
    : "Map area";

  const onTabPress = (name: ExploreHeaderTab) => {
    if (name === FOR_YOU_TAB) {
      if (discoveryMode === "forYou" && selectedRegion === null) {
        onClose();
        return;
      }
      void restoreForYouFeed();
      onClose();
      return;
    }

    if (name === SAVED_TAB) {
      if (discoveryMode === "saved") {
        onClose();
        return;
      }
      void loadSavedFeed();
      onClose();
      return;
    }

    if (name === HERE_TAB) {
      onClose();
      return;
    }

    if (!isContinent(name)) return;

    if (selectedRegion === name && discoveryMode === "region") {
      void setRegionFilter(null);
      onClose();
      return;
    }

    void setRegionFilter(name);
    onClose();
  };

  const continentStartIndex = headerTabs.findIndex((tab) =>
    tab === HERE_TAB ? discoveryMode === "here" : isContinent(tab),
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-24, 24])
        .onUpdate((event) => {
          if (isDismissing.value) return;
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          if (isDismissing.value) return;

          const shouldDismiss =
            event.translationY > SHEET_DISMISS_DRAG_PX ||
            event.velocityY > SHEET_DISMISS_VELOCITY;

          if (!shouldDismiss) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
            return;
          }

          isDismissing.value = true;
          translateY.value = withTiming(
            SHEET_DISMISS_EXIT_PX,
            { duration: 200 },
            (finished) => {
              if (finished) {
                runOnJS(onClose)();
              }
            },
          );
        }),
    [isDismissing, onClose, translateY],
  );

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleBackdropClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close feed filters"
          onPress={handleBackdropClose}
        />
        {visible ? (
          <GestureDetector gesture={panGesture}>
            <Animated.View
              entering={SHEET_ENTER}
              style={styles.sheetEnterWrapper}
            >
              <Animated.View
                style={[
                  styles.sheet,
                  dragStyle,
                  { paddingBottom: insets.bottom + 12 },
                ]}
                accessibilityViewIsModal
                accessibilityRole="adjustable"
                accessibilityLabel="Browse feed filters"
                accessibilityHint="Swipe down to close"
              >
                <View style={styles.handleWrap}>
                  <View style={styles.handleBar} />
                </View>

                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Browse feed</Text>
                </View>

                <View style={styles.menuPanel}>
                  {headerTabs.map((name, index) => {
                    const selected = name === selectedTab;
                    const showPersonalHeader =
                      index === 0 && name === FOR_YOU_TAB;
                    const showContinentsHeader =
                      index === continentStartIndex && continentStartIndex >= 0;

                    const accessibilityLabel =
                      name === FOR_YOU_TAB
                        ? "Show your personalized country feed"
                        : name === SAVED_TAB
                          ? selected
                            ? `Saved countries, ${savedCount} items`
                            : `Show ${savedCount} saved countries as a swipe deck`
                          : name === HERE_TAB
                            ? `Here mode: ${hereScopeLabel}, ${countryCount} countries`
                            : selected
                              ? `Clear ${name} filter and show For You feed`
                              : `Show countries in ${name}`;

                    const label =
                      name === FOR_YOU_TAB
                        ? name
                        : name === SAVED_TAB
                          ? savedCount > 0
                            ? `${name} (${savedCount})`
                            : name
                          : name === HERE_TAB
                            ? name
                            : continentTabLabel(name, true);

                    return (
                      <View key={name}>
                        {showPersonalHeader ? (
                          <Text style={styles.sectionLabel}>Personal</Text>
                        ) : null}
                        {showContinentsHeader ? (
                          <Text style={styles.sectionLabel}>World</Text>
                        ) : null}
                        {index > 0 &&
                        !showContinentsHeader &&
                        !showPersonalHeader ? (
                          <View style={styles.menuDivider} />
                        ) : null}
                        <FeedMenuRow
                          label={label}
                          selected={selected}
                          accessibilityLabel={accessibilityLabel}
                          onPress={() => onTabPress(name)}
                        />
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheetEnterWrapper: {
    width: "100%",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: EXPLORE_SWIPE_TAB_BAR_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_TAB_BAR_BORDER,
    gap: 4,
  },
  handleWrap: {
    alignItems: "center",
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  sheetHeader: {
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  menuPanel: {
    gap: 0,
    marginTop: 4,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 48,
    paddingVertical: 6,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    includeFontPadding: false,
  },
  menuLabelSelected: {
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
