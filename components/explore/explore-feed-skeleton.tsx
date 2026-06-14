import { Platform, StyleSheet, View } from "react-native";

import { ExploreSwipeHeader } from "@/components/explore/explore-swipe-header";
import {
  SkeletonBone,
  useSkeletonPulse,
} from "@/components/explore/skeleton-bone";
import {
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
  EXPLORE_SWIPE_CARD_BORDER,
  EXPLORE_SWIPE_CARD_ELEVATION,
  EXPLORE_SWIPE_CARD_FACT_LABEL_LINE_HEIGHT,
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
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";

export function ExploreFeedSkeleton() {
  const pulse = useSkeletonPulse();

  return (
    <View style={styles.feed} accessibilityLabel="Loading explore feed">
      <ExploreSwipeHeader />

      <View
        style={[
          styles.deckRegion,
          {
            paddingBottom: EXPLORE_SWIPE_DECK_VERTICAL_GAP + 24,
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

          <View style={styles.infoRegion}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <SkeletonBone
                  pulse={pulse}
                  width="62%"
                  height={EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT}
                  borderRadius={6}
                  tone="info"
                />
                <SkeletonBone
                  pulse={pulse}
                  width="48%"
                  height={EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT}
                  borderRadius={6}
                  tone="info"
                  style={{ marginTop: EXPLORE_SWIPE_CARD_INFO_HEADER_GAP }}
                />
              </View>
              <SkeletonBone
                pulse={pulse}
                width={EXPLORE_SWIPE_ACTION_BUTTON_SIZE}
                height={EXPLORE_SWIPE_ACTION_BUTTON_SIZE}
                borderRadius={999}
                tone="ring"
              />
            </View>

            <View style={styles.factSection}>
              <SkeletonBone
                pulse={pulse}
                width={88}
                height={EXPLORE_SWIPE_CARD_FACT_LABEL_LINE_HEIGHT}
                borderRadius={4}
                tone="info"
              />
              <SkeletonBone
                pulse={pulse}
                width="100%"
                height={EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT}
                borderRadius={6}
                tone="info"
              />
              <SkeletonBone
                pulse={pulse}
                width="92%"
                height={EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT}
                borderRadius={6}
                tone="info"
              />
            </View>
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
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  },
  deckRegion: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  cardShell: {
    alignSelf: "stretch",
    width: "100%",
    flex: 1,
    overflow: "hidden",
    borderRadius: EXPLORE_SWIPE_CARD_RADIUS,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: EXPLORE_SWIPE_CARD_BORDER,
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
  heroBoneShell: {
    flex: 1,
    minHeight: 0,
    backgroundColor: EXPLORE_SWIPE_CARD_IMAGE_FALLBACK,
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
  infoRegion: {
    flexShrink: 0,
    height: EXPLORE_SWIPE_CARD_INFO_REGION_HEIGHT,
    paddingTop: EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_TOP,
    paddingBottom: EXPLORE_SWIPE_CARD_INFO_REGION_PADDING_BOTTOM,
    paddingHorizontal: EXPLORE_SWIPE_CARD_HORIZONTAL_PADDING,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EXPLORE_SWIPE_CARD_INFO_BORDER,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    height: EXPLORE_SWIPE_CARD_INFO_HEADER_MAX_HEIGHT,
    gap: EXPLORE_SWIPE_CARD_INFO_TITLE_ACTION_GAP,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  factSection: {
    marginTop: EXPLORE_SWIPE_CARD_INFO_REGION_GAP,
    gap: 8,
  },
});
