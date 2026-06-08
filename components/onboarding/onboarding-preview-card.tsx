import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { images } from "@/constants/images";

type DestinationFeature = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

const JAPAN_FEATURES: DestinationFeature[] = [
  {
    id: "climate",
    icon: "☀️",
    title: "CLIMATE",
    description: "Four distinct seasons across the islands.",
  },
  {
    id: "cuisine",
    icon: "🍜",
    title: "CUISINE",
    description: "Sushi, ramen, and wagyu — world-renowned.",
  },
  {
    id: "history",
    icon: "⛩️",
    title: "HISTORY",
    description: "Ancient traditions meet modern innovation.",
  },
];

function DestinationFeatureRow({
  icon,
  title,
  description,
}: DestinationFeature) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription} numberOfLines={2}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export function OnboardingPreviewCard() {
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [floatY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <View style={styles.card}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <Text style={styles.countryLabel}>JAPAN</Text>
            <Text style={styles.flag}>🇯🇵</Text>
          </View>

          <View style={styles.mediaWrap}>
            <Image
              source={images.onboardingDiscoverPoster}
              style={styles.mediaImage}
              contentFit="cover"
              transition={200}
            />
          </View>

          <View style={styles.features}>
            {JAPAN_FEATURES.map((feature, index) => (
              <View key={feature.id}>
                {index > 0 ? <View style={styles.featureDivider} /> : null}
                <DestinationFeatureRow {...feature} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    width: "88%",
    maxWidth: 320,
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.14)",
    backgroundColor: "rgba(11, 19, 43, 0.38)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  cardInner: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countryLabel: {
    color: "#FBBF24",
    fontFamily: "Poppins-Bold",
    fontSize: 14,
    letterSpacing: 1.4,
  },
  flag: {
    fontSize: 16,
  },
  mediaWrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    aspectRatio: 16 / 9,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  features: {
    gap: 0,
  },
  featureDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 2,
  },
  featureIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  featureCopy: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    color: "#F8FAFC",
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  featureDescription: {
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    lineHeight: 15,
  },
});
