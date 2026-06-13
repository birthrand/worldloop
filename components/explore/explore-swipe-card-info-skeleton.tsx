import { StyleSheet, View } from "react-native";

import {
  SkeletonBone,
  useSkeletonPulse,
} from "@/components/explore/skeleton-bone";
import {
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE,
  EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE,
  EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT,
  EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP,
  EXPLORE_SWIPE_CARD_INFO_TEXT_GAP,
  EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";

const CARD_ACTION_COUNT = 3;
const CARD_ACTION_RAIL_WIDTH =
  EXPLORE_SWIPE_ACTION_BUTTON_SIZE * CARD_ACTION_COUNT +
  EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP * (CARD_ACTION_COUNT - 1);
const CARD_ACTION_OPTICAL_INSET =
  (EXPLORE_SWIPE_ACTION_BUTTON_SIZE - EXPLORE_SWIPE_CARD_ACTION_ICON_SIZE) / 2;

type ExploreSwipeCardInfoSkeletonProps = {
  interactive?: boolean;
};

export function ExploreSwipeCardInfoSkeleton({
  interactive = true,
}: ExploreSwipeCardInfoSkeletonProps) {
  const pulse = useSkeletonPulse();

  return (
    <>
      <View style={styles.infoTopRow}>
        <View
          style={[
            styles.infoText,
            interactive ? styles.infoTextWithActions : null,
          ]}
        >
          <SkeletonBone
            pulse={pulse}
            width="60%"
            height={EXPLORE_SWIPE_TEXT_HEADER_LINE_HEIGHT}
          />
          <SkeletonBone
            pulse={pulse}
            width="40%"
            height={EXPLORE_SWIPE_TEXT_BODY}
            borderRadius={4}
          />
        </View>

        {interactive ? (
          <View style={styles.actions}>
            {Array.from({ length: CARD_ACTION_COUNT }, (_, index) => (
              <SkeletonBone
                key={`action-bone-${index}`}
                pulse={pulse}
                width={EXPLORE_SWIPE_ACTION_BUTTON_SIZE}
                height={EXPLORE_SWIPE_ACTION_BUTTON_SIZE}
                borderRadius={EXPLORE_SWIPE_ACTION_BUTTON_SIZE / 2}
                tone="ring"
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.factSection}>
        <SkeletonBone
          pulse={pulse}
          width="100%"
          height={EXPLORE_SWIPE_CARD_FACT_MIN_HEIGHT}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  infoTopRow: {
    position: "relative",
    minHeight: EXPLORE_SWIPE_CARD_INFO_TOP_ROW_MIN_HEIGHT,
  },
  infoText: {
    gap: EXPLORE_SWIPE_CARD_INFO_TEXT_GAP,
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  },
  infoTextWithActions: {
    paddingRight:
      EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING +
      CARD_ACTION_RAIL_WIDTH -
      CARD_ACTION_OPTICAL_INSET,
  },
  actions: {
    position: "absolute",
    right: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING - CARD_ACTION_OPTICAL_INSET,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: EXPLORE_SWIPE_CARD_FOOTER_ACTION_GAP,
  },
  factSection: {
    alignSelf: "stretch",
    paddingHorizontal: EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  },
});
