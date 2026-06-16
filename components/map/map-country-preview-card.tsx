import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Divider } from "@/components/ai-explorer/divider";
import { StatItem } from "@/components/ai-explorer/stat-item";
import { FlagBadge } from "@/components/explore/flag-badge";
import { OnboardingCta } from "@/components/onboarding/onboarding-cta";
import { COUNTRY_DETAIL_MODULE_BG } from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_CARD_ACTION_ICON_COLOR,
  EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE,
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_SCREEN_BG,
  EXPLORE_SWIPE_TEXT_HEADER,
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
  EXPLORE_SWIPE_TOUCH_TARGET,
} from "@/constants/explore-swipe-layout";
import { continentDisplayLabel } from "@/constants/regions";
import {
  formatOfficialLanguages,
  formatPopulation,
} from "@/lib/format-country";
import {
  cca2FromFlagUrl,
  languagesForMapCountry,
  mapCountryToCountry,
} from "@/lib/map-country";
import {
  openCountryDetail,
  warmCountryDetail,
} from "@/lib/open-country-detail";
import { useCountryFeedStore } from "@/store/use-country-feed-store";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { MapCountry } from "@/types/country";

type MapCountryPreviewCardProps = {
  country: MapCountry;
  onDismiss: () => void;
  bottomInset?: number;
  /** Explore → Map preview only — opens country detail with map return handoff. */
  showViewCountryCta?: boolean;
};

const COUNTRY_NAME_FONT_SIZE = EXPLORE_SWIPE_TEXT_HEADER;
const COUNTRY_NAME_LINE_HEIGHT = EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT;
const COUNTRY_NAME_MIN_FONT_SIZE = 15;
const FLAG_WIDTH = 32;
const FLAG_HEIGHT = 22;

const PREVIEW_CARD_ENTER = SlideInDown.springify()
  .damping(20)
  .stiffness(150)
  .mass(0.85);

const PREVIEW_CARD_EXIT = SlideOutDown.springify()
  .damping(24)
  .stiffness(200)
  .mass(0.75);

const PREVIEW_DISMISS_DRAG_PX = 88;
const PREVIEW_DISMISS_VELOCITY = 900;
const PREVIEW_DISMISS_EXIT_PX = 420;
/** Space between country title row and stats panel. */
const PREVIEW_HEADER_STATS_GAP = 18;
/** Space between stats panel and optional CTA. */
const PREVIEW_STATS_CTA_GAP = 14;
/** Extra space below stats — above safe area inset from parent. */
const PREVIEW_CARD_CONTENT_BOTTOM_PADDING = 48;

export function MapCountryPreviewCard({
  country,
  onDismiss,
  bottomInset = 0,
  showViewCountryCta = false,
}: MapCountryPreviewCardProps) {
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const cca2 = cca2FromFlagUrl(country.flag);
  const regionLabel = continentDisplayLabel(country.region);
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));
  const feedCountries = useCountryFeedStore((s) => s.countries);
  const countryForSave = useMemo(() => mapCountryToCountry(country), [country]);
  const countryForDetail = useMemo(() => {
    const feedCountry =
      feedCountries.find((entry) => entry.name === country.name) ?? null;
    return mapCountryToCountry(country, feedCountry);
  }, [country, feedCountries]);
  const languagesLabel = useMemo(
    () =>
      formatOfficialLanguages(languagesForMapCountry(country, feedCountries)),
    [country, feedCountries],
  );

  const handleToggleSaved = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSaved(countryForSave);
  };

  const handleViewCountry = () => {
    warmCountryDetail(countryForDetail);
    openCountryDetail(countryForDetail, {
      from: "explore",
      returnToMap: true,
    });
  };

  useEffect(() => {
    translateY.value = 0;
    isDismissing.value = false;
  }, [country.name]);

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
            event.translationY > PREVIEW_DISMISS_DRAG_PX ||
            event.velocityY > PREVIEW_DISMISS_VELOCITY;

          if (!shouldDismiss) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
            return;
          }

          isDismissing.value = true;
          translateY.value = withTiming(
            PREVIEW_DISMISS_EXIT_PX,
            { duration: 200 },
            (finished) => {
              if (finished) {
                runOnJS(onDismiss)();
              }
            },
          );
        }),
    [isDismissing, onDismiss, translateY],
  );

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={PREVIEW_CARD_ENTER}
        exiting={PREVIEW_CARD_EXIT}
        style={[
          styles.card,
          dragStyle,
          {
            paddingBottom: bottomInset + PREVIEW_CARD_CONTENT_BOTTOM_PADDING,
          },
        ]}
        accessibilityRole="adjustable"
        accessibilityLabel={`${country.name} preview`}
        accessibilityHint="Swipe down to close"
      >
        <View style={styles.handleWrap}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.header}>
          <FlagBadge
            flag={country.flag}
            iso2={cca2}
            width={FLAG_WIDTH}
            height={FLAG_HEIGHT}
          />
          <Text
            style={styles.countryName}
            numberOfLines={2}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={
              COUNTRY_NAME_MIN_FONT_SIZE / COUNTRY_NAME_FONT_SIZE
            }
          >
            {country.name}
          </Text>
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
            onPress={handleToggleSaved}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
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

        <View style={styles.statsPanel}>
          <View style={styles.statsRow}>
            <StatItem
              tile
              align="start"
              label="Population"
              value={formatPopulation(country.population)}
            />
            <Divider vertical />
            <StatItem
              tile
              align="start"
              label="Capital"
              value={country.capital || "—"}
            />
          </View>
          <Divider />
          <View style={styles.statsRow}>
            <StatItem tile align="start" label="Region" value={regionLabel} />
            <Divider vertical />
            <StatItem
              tile
              align="start"
              label="Language"
              value={languagesLabel}
            />
          </View>
        </View>

        {showViewCountryCta ? (
          <View style={styles.viewCountryCtaWrap}>
            <OnboardingCta label="View Country" onPress={handleViewCountry} />
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 8,
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
    gap: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: EXPLORE_SWIPE_SCREEN_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.38,
        shadowRadius: 18,
      },
      android: {
        elevation: 16,
      },
      default: {},
    }),
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countryName: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: "Poppins-SemiBold",
    fontSize: COUNTRY_NAME_FONT_SIZE,
    lineHeight: COUNTRY_NAME_LINE_HEIGHT,
    letterSpacing: -0.2,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  saveButton: {
    width: EXPLORE_SWIPE_TOUCH_TARGET,
    height: EXPLORE_SWIPE_TOUCH_TARGET,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonPressed: {
    opacity: 0.78,
  },
  statsPanel: {
    marginTop: PREVIEW_HEADER_STATS_GAP,
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
  viewCountryCtaWrap: {
    marginTop: PREVIEW_STATS_CTA_GAP,
  },
});
