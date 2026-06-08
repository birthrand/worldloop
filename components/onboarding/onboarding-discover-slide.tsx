import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { animations } from "@/constants/animations";

type OrbitDestination = {
  id: string;
  name: string;
  flag: string;
  image: string;
  left: `${number}%`;
  top: `${number}%`;
  rotation: number;
  delayMs: number;
};

const DESTINATIONS: OrbitDestination[] = [
  {
    id: "brazil",
    name: "Brazil",
    flag: "🇧🇷",
    image:
      "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&q=80",
    left: "8%",
    top: "18%",
    rotation: -14,
    delayMs: 0,
  },
  {
    id: "iceland",
    name: "Iceland",
    flag: "🇮🇸",
    image:
      "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=400&q=80",
    left: "62%",
    top: "12%",
    rotation: 10,
    delayMs: 400,
  },
  {
    id: "kenya",
    name: "Kenya",
    flag: "🇰🇪",
    image:
      "https://images.unsplash.com/photo-1516026672322-bc52d690a55d?w=400&q=80",
    left: "72%",
    top: "52%",
    rotation: -8,
    delayMs: 800,
  },
];

type OrbitCardProps = OrbitDestination;

function OrbitCard({
  name,
  flag,
  image,
  left,
  top,
  rotation,
  delayMs,
}: OrbitCardProps) {
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(6, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [delayMs, floatY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { rotate: `${rotation}deg` }],
  }));

  return (
    <Animated.View style={[styles.orbitCard, animatedStyle, { left, top }]}>
      <View style={styles.orbitCardInner}>
        <Image
          source={{ uri: image }}
          style={styles.orbitImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(11, 19, 43, 0.85)"]}
          style={styles.orbitImageFade}
        />
        <View style={styles.orbitLabel}>
          <Text style={styles.orbitFlag}>{flag}</Text>
          <Text style={styles.orbitName}>{name}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function AuroraOrb({
  size,
  left,
  top,
  color,
  delayMs,
}: {
  size: number;
  left: `${number}%`;
  top: `${number}%`;
  color: string;
  delayMs: number;
}) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0.85, {
            duration: 3200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.45, {
            duration: 3200,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );
  }, [delayMs, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.92 + pulse.value * 0.12 }],
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          top,
          backgroundColor: color,
        },
      ]}
    />
  );
}

function Constellation() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.constellationLine, styles.lineOne]} />
      <View style={[styles.constellationLine, styles.lineTwo]} />
      <View style={[styles.constellationDot, { left: "28%", top: "34%" }]} />
      <View style={[styles.constellationDot, { left: "48%", top: "28%" }]} />
      <View style={[styles.constellationDot, { left: "68%", top: "38%" }]} />
      <View style={[styles.constellationDot, { left: "42%", top: "58%" }]} />
    </View>
  );
}

export function OnboardingDiscoverSlide() {
  const { width } = useWindowDimensions();
  const globeSize = Math.min(width * 0.72, 280);

  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={[
          "rgba(11, 19, 43, 0.35)",
          "rgba(11, 19, 43, 0.55)",
          "rgba(11, 19, 43, 0.72)",
          "rgba(11, 19, 43, 0.82)",
        ]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <AuroraOrb
        size={220}
        left="-12%"
        top="8%"
        color="rgba(56, 189, 248, 0.22)"
        delayMs={0}
      />
      <AuroraOrb
        size={180}
        left="58%"
        top="4%"
        color="rgba(167, 139, 250, 0.2)"
        delayMs={600}
      />
      <AuroraOrb
        size={200}
        left="20%"
        top="48%"
        color="rgba(251, 191, 36, 0.14)"
        delayMs={1200}
      />

      <Constellation />

      <View style={styles.badgeWrap}>
        <View style={styles.badge}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={24}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Ionicons name="sparkles" size={13} color="#FBBF24" />
          <Text style={styles.badgeText}>AI-powered country insights</Text>
        </View>
      </View>

      <View style={styles.stage}>
        {DESTINATIONS.map((destination) => (
          <OrbitCard key={destination.id} {...destination} />
        ))}

        <View
          style={[
            styles.globeClip,
            {
              width: globeSize,
              height: globeSize,
              borderRadius: globeSize / 2,
            },
          ]}
        >
          <View
            style={[
              styles.globeGlow,
              { width: globeSize * 1.15, height: globeSize * 1.15 },
            ]}
          />
          <LottieView
            source={animations.globeOnboarding}
            autoPlay
            loop
            style={[
              styles.globeLottie,
              { width: globeSize, height: globeSize },
            ]}
          />
        </View>

        <View style={styles.swipeHint}>
          <Ionicons name="chevron-up" size={14} color="#94A3B8" />
          <Text style={styles.swipeHintText}>Swipe up for next country</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  orb: {
    position: "absolute",
  },
  constellationLine: {
    position: "absolute",
    height: 1,
    backgroundColor: "rgba(251, 191, 36, 0.18)",
    transformOrigin: "left center",
  },
  lineOne: {
    left: "28%",
    top: "35%",
    width: "22%",
    transform: [{ rotate: "-8deg" }],
  },
  lineTwo: {
    left: "48%",
    top: "30%",
    width: "24%",
    transform: [{ rotate: "18deg" }],
  },
  constellationDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(251, 191, 36, 0.55)",
  },
  badgeWrap: {
    paddingTop: 12,
    alignItems: "center",
    zIndex: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.28)",
    backgroundColor: "rgba(11, 19, 43, 0.55)",
  },
  badgeText: {
    color: "#E2E8F0",
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  stage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 24,
  },
  globeClip: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  globeLottie: {
    backgroundColor: "transparent",
  },
  globeGlow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
  },
  orbitCard: {
    position: "absolute",
    width: 88,
    zIndex: 3,
  },
  orbitCardInner: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(11, 19, 43, 0.65)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  orbitImage: {
    width: "100%",
    height: 72,
  },
  orbitImageFade: {
    ...StyleSheet.absoluteFillObject,
    top: "40%",
  },
  orbitLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  orbitFlag: {
    fontSize: 12,
  },
  orbitName: {
    color: "#F8FAFC",
    fontFamily: "Poppins-SemiBold",
    fontSize: 11,
  },
  swipeHint: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  swipeHintText: {
    color: "#94A3B8",
    fontFamily: "Poppins-Regular",
    fontSize: 11,
  },
});
