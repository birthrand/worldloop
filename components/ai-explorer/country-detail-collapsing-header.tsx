import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  COUNTRY_DETAIL_STICKY_HEADER_ROW_HEIGHT,
  COUNTRY_DETAIL_TITLE_CROSSFADE_RANGE,
  getCountryDetailTitleCollapseThreshold,
} from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR,
  EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_TEXT_HEADER,
} from "@/constants/explore-swipe-layout";
import { resolveVisitCountryId } from "@/lib/discovery-progress";
import { useDiscoveryProgressStore } from "@/store/use-discovery-progress-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import { useToastStore } from "@/store/use-toast-store";
import type { Country } from "@/types/country";

const COUNTRY_NAME_FONT_SIZE = EXPLORE_SWIPE_TEXT_HEADER;
const HEADER_HORIZONTAL_PADDING = 16;
const HEADER_SIDE_BUTTON_SIZE = 40;
const HEADER_TITLE_GAP = 8;
const HEADER_ACTION_GAP = 4;
const HEADER_SIDE_INSET =
  HEADER_HORIZONTAL_PADDING + HEADER_SIDE_BUTTON_SIZE + HEADER_TITLE_GAP;
const HEADER_RIGHT_INSET =
  HEADER_HORIZONTAL_PADDING +
  HEADER_SIDE_BUTTON_SIZE * 2 +
  HEADER_ACTION_GAP +
  HEADER_TITLE_GAP;

type CountryDetailCollapsingHeaderProps = {
  country: Country;
  countryName: string;
  scrollY: SharedValue<number>;
  screenHeight: number;
  onBack: () => void;
};

export function CountryDetailCollapsingHeader({
  country,
  countryName,
  scrollY,
  screenHeight,
  onBack,
}: CountryDetailCollapsingHeaderProps) {
  const insets = useSafeAreaInsets();
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));
  const toggleVisited = useDiscoveryProgressStore(
    (s) => s.toggleCountryVisited,
  );
  const visitId = resolveVisitCountryId(country);
  const visited = useDiscoveryProgressStore((s) =>
    s.visitedCountryIds.includes(visitId),
  );
  const saved = isSaved;
  const collapseThreshold = getCountryDetailTitleCollapseThreshold(
    screenHeight,
    insets.top,
  );
  const fadeStart = Math.max(
    0,
    collapseThreshold - COUNTRY_DETAIL_TITLE_CROSSFADE_RANGE,
  );

  const headerBarStyle = useAnimatedStyle(() => {
    const backgroundOpacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity * 0.96})`,
      borderBottomColor: `rgba(255, 255, 255, ${backgroundOpacity * 0.08})`,
      borderBottomWidth:
        backgroundOpacity > 0.01 ? StyleSheet.hairlineWidth : 0,
    };
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [6, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const heroBackStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  const stickyBackStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  const handleToggleSaved = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSaved(country);
  };

  const handleToggleVisited = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasVisited = visited;
    toggleVisited(country);
    useToastStore
      .getState()
      .showToast(wasVisited ? "Removed from visited" : "Marked as visited");
  };

  const savedIcon = saved ? "bookmark" : "bookmark-outline";
  const visitedIcon = visited ? "checkmark-circle" : "checkmark-circle-outline";
  const heroSavedColor = saved
    ? EXPLORE_SWIPE_ACCENT_COLOR
    : EXPLORE_SWIPE_CARD_TITLE_COLOR;
  const stickySavedColor = saved
    ? EXPLORE_SWIPE_ACCENT_COLOR
    : EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR;
  const heroVisitedColor = visited
    ? EXPLORE_SWIPE_ACCENT_COLOR
    : EXPLORE_SWIPE_CARD_TITLE_COLOR;
  const stickyVisitedColor = visited
    ? EXPLORE_SWIPE_ACCENT_COLOR
    : EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.bar, { paddingTop: insets.top + 8 }, headerBarStyle]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={({ pressed }) => [
            styles.backSlot,
            pressed && styles.backSlotPressed,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.backLayer, heroBackStyle]}
          >
            <View style={styles.heroBackButton}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </View>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[styles.backLayer, stickyBackStyle]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={EXPLORE_SWIPE_CARD_TITLE_COLOR}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.actionGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visited
                ? `Unmark ${country.name} as visited`
                : `Mark ${country.name} as visited`
            }
            accessibilityHint={
              visited
                ? "Removes this country from your visited list"
                : "Adds this country to your visited list and travel map"
            }
            accessibilityState={{ selected: visited }}
            onPress={handleToggleVisited}
            style={({ pressed }) => [
              styles.actionSlot,
              pressed && styles.actionSlotPressed,
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[styles.actionLayer, heroBackStyle]}
            >
              <View style={styles.heroActionButton}>
                <Ionicons
                  name={visitedIcon}
                  size={EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE}
                  color={heroVisitedColor}
                />
              </View>
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[styles.actionLayer, stickyBackStyle]}
            >
              <Ionicons
                name={visitedIcon}
                size={EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE}
                color={stickyVisitedColor}
              />
            </Animated.View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              saved ? `Unsave ${country.name}` : `Save ${country.name}`
            }
            accessibilityHint={
              saved
                ? "Removes this country from your saved list"
                : "Adds this country to your saved list"
            }
            onPress={handleToggleSaved}
            style={({ pressed }) => [
              styles.actionSlot,
              pressed && styles.actionSlotPressed,
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[styles.actionLayer, heroBackStyle]}
            >
              <View style={styles.heroActionButton}>
                <Ionicons
                  name={savedIcon}
                  size={EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE}
                  color={heroSavedColor}
                />
              </View>
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[styles.actionLayer, stickyBackStyle]}
            >
              <Ionicons
                name={savedIcon}
                size={EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE}
                color={stickySavedColor}
              />
            </Animated.View>
          </Pressable>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[styles.titleWrap, headerTitleStyle]}
        >
          <Animated.Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {countryName}
          </Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    elevation: 30,
  },
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: HEADER_HORIZONTAL_PADDING,
  },
  backSlot: {
    zIndex: 2,
    width: HEADER_SIDE_BUTTON_SIZE,
    height: HEADER_SIDE_BUTTON_SIZE,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  backSlotPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  backLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBackButton: {
    width: HEADER_SIDE_BUTTON_SIZE,
    height: HEADER_SIDE_BUTTON_SIZE,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    zIndex: 1,
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    paddingLeft: HEADER_SIDE_INSET,
    paddingRight: HEADER_RIGHT_INSET,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    width: "100%",
    maxWidth: "100%",
    textAlign: "center",
    fontFamily: "Poppins-SemiBold",
    fontSize: COUNTRY_NAME_FONT_SIZE,
    lineHeight: COUNTRY_DETAIL_STICKY_HEADER_ROW_HEIGHT,
    letterSpacing: -0.2,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  actionGroup: {
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: HEADER_ACTION_GAP,
    flexShrink: 0,
  },
  actionSlot: {
    zIndex: 2,
    width: HEADER_SIDE_BUTTON_SIZE,
    height: HEADER_SIDE_BUTTON_SIZE,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSlotPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  actionLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heroActionButton: {
    width: HEADER_SIDE_BUTTON_SIZE,
    height: HEADER_SIDE_BUTTON_SIZE,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});
