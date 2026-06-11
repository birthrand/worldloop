import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type DimensionValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExploreTopBar } from "@/components/explore/explore-top-bar";
import {
  EXPLORE_FEED_BODY_BG,
  EXPLORE_FEED_BOTTOM_INSET,
  EXPLORE_FEED_SURFACE_RADIUS,
  getExploreHeroTopInset,
} from "@/constants/explore-feed-layout";

const SKELETON_COLOR = "rgba(255, 255, 255, 0.14)";

type SkeletonBoneProps = {
  pulse: Animated.Value;
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  style?: object;
};

function SkeletonBone({
  pulse,
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonBoneProps) {
  return (
    <Animated.View
      style={[
        styles.bone,
        {
          width,
          height,
          borderRadius,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.4)).current;

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
  const insets = useSafeAreaInsets();
  const pulse = useSkeletonPulse();
  const heroTopInset = getExploreHeroTopInset(insets.top);

  return (
    <View style={styles.feed} accessibilityLabel="Loading explore feed">
      <View style={styles.feedBody}>
        <View style={[styles.pageContent, { paddingTop: heroTopInset }]}>
          <View style={styles.feedUnit}>
            <View style={styles.heroRegion}>
              <SkeletonBone
                pulse={pulse}
                width="100%"
                height="100%"
                borderRadius={0}
                style={styles.heroSkeleton}
              />
            </View>

            <View
              style={[
                styles.cardRegion,
                { paddingBottom: EXPLORE_FEED_BOTTOM_INSET },
              ]}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <SkeletonBone
                    pulse={pulse}
                    width={32}
                    height={32}
                    borderRadius={16}
                  />
                  <View style={styles.cardTitleBlock}>
                    <SkeletonBone
                      pulse={pulse}
                      width="72%"
                      height={16}
                      borderRadius={6}
                    />
                    <SkeletonBone
                      pulse={pulse}
                      width="48%"
                      height={12}
                      borderRadius={4}
                    />
                  </View>
                </View>
                <SkeletonBone
                  pulse={pulse}
                  width="100%"
                  height={12}
                  borderRadius={4}
                />
                <SkeletonBone
                  pulse={pulse}
                  width="94%"
                  height={12}
                  borderRadius={4}
                />
                <SkeletonBone
                  pulse={pulse}
                  width="78%"
                  height={12}
                  borderRadius={4}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      <ExploreTopBar overlay />
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    flex: 1,
  },
  feedBody: {
    flex: 1,
    backgroundColor: EXPLORE_FEED_BODY_BG,
  },
  pageContent: {
    flex: 1,
  },
  feedUnit: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: EXPLORE_FEED_SURFACE_RADIUS,
    borderBottomRightRadius: EXPLORE_FEED_SURFACE_RADIUS,
  },
  heroRegion: {
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
  heroSkeleton: {
    flex: 1,
  },
  cardRegion: {
    flexShrink: 0,
    width: "100%",
  },
  card: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 6,
  },
  bone: {
    backgroundColor: SKELETON_COLOR,
  },
});
