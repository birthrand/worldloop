import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
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

import { OnboardingCta } from "@/components/onboarding/onboarding-cta";
import { TravelMapLegendBadges } from "@/components/travel-map/travel-map-legend-badges";
import {
  EXPLORE_SWIPE_CARD_INFO_BORDER,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_SCREEN_BG,
  EXPLORE_SWIPE_TEXT_HEADER,
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";
import {
  openLandmarkCountryDetail,
  warmCountryDetail,
} from "@/lib/open-landmark-country-detail";
import type { TravelMapLandmarkPin } from "@/lib/travel-map-pins";
import { resolveTravelMapLandmarkFeedItem } from "@/lib/travel-map-pins";
import { useIdentityStore } from "@/store/use-identity-store";

type MapLandmarkPreviewCardProps = {
  pin: TravelMapLandmarkPin;
  onDismiss: () => void;
  bottomInset?: number;
  /** Country-detail landmark handoff — name/country only, no travel legend or CTA. */
  compact?: boolean;
};

const PREVIEW_CARD_ENTER = SlideInDown.springify()
  .damping(20)
  .stiffness(150)
  .mass(0.85)
  .overshootClamping(1);

const PREVIEW_CARD_EXIT = SlideOutDown.springify()
  .damping(24)
  .stiffness(200)
  .mass(0.75);

const PREVIEW_DISMISS_DRAG_PX = 88;
const PREVIEW_DISMISS_VELOCITY = 900;
const PREVIEW_DISMISS_EXIT_PX = 420;
const PREVIEW_CARD_CONTENT_BOTTOM_PADDING = 48;
const PREVIEW_CARD_COMPACT_BOTTOM_PADDING = 28;
const PREVIEW_HANDLE_CONTENT_GAP = 16;

export function MapLandmarkPreviewCard({
  pin,
  onDismiss,
  bottomInset = 0,
  compact = false,
}: MapLandmarkPreviewCardProps) {
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);
  const feedItem = useMemo(() => resolveTravelMapLandmarkFeedItem(pin), [pin]);

  useEffect(() => {
    translateY.value = 0;
    isDismissing.value = false;
  }, [pin.id]);

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

  const handleViewLandmark = () => {
    if (!feedItem) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const identity = useIdentityStore.getState();
    identity.setCountryDetailReturnToMap(true);
    identity.setTravelLandmarkPreviewPinId(pin.id);
    warmCountryDetail(feedItem.country);
    openLandmarkCountryDetail(feedItem, "profile");
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={PREVIEW_CARD_ENTER}
        exiting={PREVIEW_CARD_EXIT}
        style={[
          styles.card,
          compact && styles.cardCompact,
          dragStyle,
          {
            paddingBottom:
              bottomInset +
              (compact
                ? PREVIEW_CARD_COMPACT_BOTTOM_PADDING
                : PREVIEW_CARD_CONTENT_BOTTOM_PADDING),
          },
        ]}
        accessibilityRole="adjustable"
        accessibilityLabel={`${pin.name} preview`}
        accessibilityHint="Swipe down or tap outside to close"
      >
        <View style={[styles.handleWrap, compact && styles.handleWrapCompact]}>
          <View style={styles.handleBar} />
        </View>

        <View style={[styles.header, compact && styles.headerCompact]}>
          <View style={styles.iconWrap}>
            <Ionicons name="location" size={22} color="#ffffff" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title} numberOfLines={2}>
              {pin.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {pin.countryName}
            </Text>
          </View>
        </View>

        {!compact ? (
          <>
            <View style={styles.badgesWrap}>
              <TravelMapLegendBadges landmarkCategory={pin.category} />
            </View>

            <View style={styles.viewLandmarkCtaWrap}>
              <OnboardingCta
                label="View Landmark"
                onPress={handleViewLandmark}
              />
            </View>
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 8,
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
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
  cardCompact: {
    paddingTop: 12,
  },
  handleWrap: {
    alignItems: "center",
    paddingBottom: 8,
  },
  handleWrapCompact: {
    paddingBottom: PREVIEW_HANDLE_CONTENT_GAP,
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
  headerCompact: {
    paddingTop: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_TEXT_HEADER,
    lineHeight: EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
  badgesWrap: {
    marginTop: 16,
  },
  viewLandmarkCtaWrap: {
    marginTop: 18,
  },
});
