import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";

import { ExploreSwipeHeader } from "@/components/explore/explore-swipe-header";
import {
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
  EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT,
  EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT,
  EXPLORE_SWIPE_CARD_RADIUS,
  EXPLORE_SWIPE_CARD_SHADOW,
  EXPLORE_SWIPE_CARD_SHADOW_OFFSET_Y,
  EXPLORE_SWIPE_CARD_SHADOW_OPACITY,
  EXPLORE_SWIPE_CARD_SHADOW_RADIUS,
  EXPLORE_SWIPE_CAROUSEL_SEGMENT_GAP,
  EXPLORE_SWIPE_CAROUSEL_SEGMENT_HEIGHT,
  EXPLORE_SWIPE_CAROUSEL_SEGMENT_WIDTH,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_DECK_VERTICAL_GAP,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";

const SKELETON_COLOR = "rgba(255, 255, 255, 0.12)";

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return pulse;
}

export function ExploreFeedSkeleton() {
  const tabBarHeight = useBottomTabBarHeight();
  const pulse = useSkeletonPulse();

  return (
    <View style={styles.feed} accessibilityLabel="Loading explore feed">
      <ExploreSwipeHeader />

      <View
        style={[
          styles.deckRegion,
          {
            paddingBottom: tabBarHeight + EXPLORE_SWIPE_DECK_VERTICAL_GAP,
          },
        ]}
      >
        <View style={styles.cardShell}>
          <View style={styles.heroBoneShell}>
            <Animated.View
              style={[
                styles.heroBone,
                {
                  opacity: pulse,
                  borderTopLeftRadius: EXPLORE_SWIPE_CARD_RADIUS,
                  borderTopRightRadius: EXPLORE_SWIPE_CARD_RADIUS,
                },
              ]}
            />
            <View style={styles.segmentBoneTrack}>
              {Array.from({ length: 4 }, (_, index) => (
                <Animated.View
                  key={`segment-bone-${index}`}
                  style={[
                    styles.segmentBone,
                    index === 0 ? styles.segmentBoneActive : null,
                    { opacity: pulse },
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.infoBone}>
            <View style={styles.infoTopBone}>
              <View style={styles.textBlock}>
                <Animated.View style={[styles.titleBone, { opacity: pulse }]} />
                <Animated.View
                  style={[styles.subtitleBone, { opacity: pulse }]}
                />
              </View>
              <View style={styles.actions}>
                <Animated.View
                  style={[styles.actionBone, { opacity: pulse }]}
                />
                <Animated.View
                  style={[styles.actionBone, { opacity: pulse }]}
                />
              </View>
            </View>
            <Animated.View style={[styles.factTextBone, { opacity: pulse }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
    backgroundColor: "transparent",
  },
  deckRegion: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  },
  cardShell: {
    alignSelf: "stretch",
    width: "100%",
    flex: 1,
    overflow: "hidden",
    borderRadius: EXPLORE_SWIPE_CARD_RADIUS,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
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
        elevation: 8,
      },
      default: {},
    }),
  },
  heroBoneShell: {
    flex: 1,
    minHeight: 0,
  },
  heroBone: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SKELETON_COLOR,
  },
  segmentBoneTrack: {
    position: "absolute",
    top: 18,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    width: EXPLORE_SWIPE_CAROUSEL_SEGMENT_WIDTH,
    gap: EXPLORE_SWIPE_CAROUSEL_SEGMENT_GAP,
  },
  segmentBone: {
    flex: 1,
    height: EXPLORE_SWIPE_CAROUSEL_SEGMENT_HEIGHT,
    borderRadius: 999,
    backgroundColor: SKELETON_COLOR,
  },
  segmentBoneActive: {
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  infoBone: {
    flexShrink: 0,
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  infoTopBone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT,
  },
  textBlock: {
    flex: 1,
    gap: 8,
  },
  titleBone: {
    width: "60%",
    height: EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
    borderRadius: 6,
    backgroundColor: SKELETON_COLOR,
  },
  subtitleBone: {
    width: "40%",
    height: EXPLORE_SWIPE_TEXT_BODY,
    borderRadius: 4,
    backgroundColor: SKELETON_COLOR,
  },
  actions: {
    flexDirection: "row",
    gap: EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP,
  },
  actionBone: {
    width: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    height: EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
    borderRadius: EXPLORE_SWIPE_ACTION_BUTTON_SIZE / 2,
    backgroundColor: "transparent",
  },
  factTextBone: {
    width: "100%",
    height: EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT,
    borderRadius: 6,
    backgroundColor: SKELETON_COLOR,
  },
});
