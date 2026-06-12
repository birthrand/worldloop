import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type DimensionValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { CultureTopBar } from "@/components/culture/culture-top-bar";
import {
  CULTURE_CHROME_ICON_SIZE,
  CULTURE_CHROME_RAIL_GAP,
} from "@/constants/culture-chrome";

const CULTURE_FEED_BODY_BG = "#0b132b";
const SKELETON_COLOR = "rgba(255, 255, 255, 0.14)";
const SKELETON_COLOR_SOFT = "rgba(255, 255, 255, 0.08)";

/** Matches `CultureOverlay` — card sits into tab bar chrome. */
const CULTURE_OVERLAY_TAB_CLEARANCE = -70;
/** Matches `CultureOverlay` action rail offset. */
const CULTURE_ACTION_RAIL_CLEARANCE = -16;
const BOTTOM_SCRIM_HEIGHT = "38%";

const FLAG_SIZE = 28;
const RAIL_ACTION_COUNT = 5;

type SkeletonBoneProps = {
  pulse: Animated.Value;
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  color?: string;
  style?: object;
};

function SkeletonBone({
  pulse,
  width,
  height,
  borderRadius = 8,
  color = SKELETON_COLOR,
  style,
}: SkeletonBoneProps) {
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.bone,
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

function SkeletonRailAction({ pulse }: { pulse: Animated.Value }) {
  return (
    <View style={styles.railAction} accessibilityElementsHidden>
      <SkeletonBone
        pulse={pulse}
        width={CULTURE_CHROME_ICON_SIZE}
        height={CULTURE_CHROME_ICON_SIZE}
        borderRadius={CULTURE_CHROME_ICON_SIZE / 2}
      />
      <SkeletonBone pulse={pulse} width={34} height={8} borderRadius={4} />
    </View>
  );
}

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
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

export function CultureFeedSkeleton() {
  const insets = useSafeAreaInsets();
  const pulse = useSkeletonPulse();

  const overlayBottomOffset =
    TAB_BAR_CONTENT_HEIGHT + insets.bottom + CULTURE_OVERLAY_TAB_CLEARANCE;
  const railBottomOffset =
    insets.bottom + TAB_BAR_CONTENT_HEIGHT + CULTURE_ACTION_RAIL_CLEARANCE;

  return (
    <View
      style={styles.feed}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading culture feed"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.feedBody}>
        <SkeletonBone
          pulse={pulse}
          width="100%"
          height="100%"
          borderRadius={0}
          color={SKELETON_COLOR_SOFT}
          style={styles.mediaSkeleton}
        />

        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.22)", "rgba(0, 0, 0, 0.48)"]}
          locations={[0, 0.55, 1]}
          style={styles.scrim}
          pointerEvents="none"
        />

        <View
          style={[styles.overlay, { paddingBottom: overlayBottomOffset }]}
          pointerEvents="none"
        >
          <View style={styles.infoBlock}>
            <View style={styles.titleRow}>
              <SkeletonBone
                pulse={pulse}
                width={FLAG_SIZE}
                height={FLAG_SIZE}
                borderRadius={FLAG_SIZE / 2}
              />
              <SkeletonBone
                pulse={pulse}
                width="58%"
                height={16}
                borderRadius={6}
                style={styles.titleBone}
              />
            </View>

            <SkeletonBone
              pulse={pulse}
              width="88%"
              height={14}
              borderRadius={5}
            />
          </View>
        </View>

        <View
          style={[styles.actionRail, { bottom: railBottomOffset }]}
          pointerEvents="none"
        >
          {Array.from({ length: RAIL_ACTION_COUNT }, (_, index) => (
            <SkeletonRailAction key={index} pulse={pulse} />
          ))}
        </View>
      </View>

      <CultureTopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
  },
  feedBody: {
    flex: 1,
    backgroundColor: CULTURE_FEED_BODY_BG,
    overflow: "hidden",
  },
  mediaSkeleton: {
    ...StyleSheet.absoluteFillObject,
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_SCRIM_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingLeft: 16,
    paddingRight: 64,
    zIndex: 2,
  },
  infoBlock: {
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleBone: {
    flexShrink: 1,
  },
  actionRail: {
    position: "absolute",
    right: 12,
    alignItems: "center",
    gap: CULTURE_CHROME_RAIL_GAP,
    zIndex: 3,
  },
  railAction: {
    alignItems: "center",
    gap: 4,
  },
  bone: {
    backgroundColor: SKELETON_COLOR,
  },
});
