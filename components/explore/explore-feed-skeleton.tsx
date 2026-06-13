import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Platform, StyleSheet, View } from "react-native";

import { ExploreSwipeCardInfoSkeleton } from "@/components/explore/explore-swipe-card-info-skeleton";
import { ExploreSwipeHeader } from "@/components/explore/explore-swipe-header";
import {
  SkeletonBone,
  useSkeletonPulse,
} from "@/components/explore/skeleton-bone";
import {
  EXPLORE_SWIPE_CARD_INFO_BG,
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
} from "@/constants/explore-swipe-layout";

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
            <SkeletonBone
              pulse={pulse}
              width="100%"
              height="100%"
              borderRadius={0}
              tone="hero"
              style={{
                ...StyleSheet.absoluteFillObject,
                borderTopLeftRadius: EXPLORE_SWIPE_CARD_RADIUS,
                borderTopRightRadius: EXPLORE_SWIPE_CARD_RADIUS,
              }}
            />
            <View style={styles.segmentBoneTrack}>
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonBone
                  key={`segment-bone-${index}`}
                  pulse={pulse}
                  height={EXPLORE_SWIPE_CAROUSEL_SEGMENT_HEIGHT}
                  borderRadius={999}
                  tone="hero"
                  style={[
                    styles.segmentBone,
                    index === 0 ? styles.segmentBoneActive : null,
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.infoBone}>
            <ExploreSwipeCardInfoSkeleton />
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
  },
  segmentBoneActive: {
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  infoBone: {
    flexShrink: 0,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
});
