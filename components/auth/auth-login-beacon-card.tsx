import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { animations } from "@/constants/animations";
import {
  AUTH_CARD_RADIUS,
  AUTH_COLORS,
  AUTH_GLOBE_ACCENT_FILTERS,
  AUTH_SPACING,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";

const HERO_MIN_HEIGHT = 168;
const GLOBE_SIZE = 88;
const ORBIT_SIZE = 108;
const FRAME_SIZE = GLOBE_SIZE + 20;
const HERO_PADDING_VERTICAL = 16;

type AuthLoginBeaconCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

type HudBracketProps = {
  flipX?: boolean;
  flipY?: boolean;
};

function HudBracket({ flipX = false, flipY = false }: HudBracketProps) {
  return (
    <View
      style={[
        styles.bracket,
        flipX && styles.bracketFlipX,
        flipY && styles.bracketFlipY,
      ]}
    />
  );
}

export function AuthLoginBeaconCard({
  title,
  subtitle,
  children,
}: AuthLoginBeaconCardProps) {
  return (
    <View style={styles.shell}>
      <BlurView
        intensity={28}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.hero}>
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.05)", "rgba(0, 0, 0, 0)"]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.beaconStage}>
          <LinearGradient
            colors={["rgba(245, 184, 76, 0.24)", "rgba(245, 184, 76, 0)"]}
            style={styles.beaconGlow}
          />

          <View style={styles.orbitContainer}>
            <View style={styles.orbitArc} />
            <View style={[styles.orbitArc, styles.orbitArcInner]} />

            <View style={styles.globeFrame}>
              <View style={[styles.bracketCorner, styles.cornerTopLeft]}>
                <HudBracket />
              </View>
              <View style={[styles.bracketCorner, styles.cornerTopRight]}>
                <HudBracket flipX />
              </View>
              <View style={[styles.bracketCorner, styles.cornerBottomLeft]}>
                <HudBracket flipY />
              </View>
              <View style={[styles.bracketCorner, styles.cornerBottomRight]}>
                <HudBracket flipX flipY />
              </View>

              <LottieView
                source={animations.globeEarth}
                autoPlay
                loop
                style={{ width: GLOBE_SIZE, height: GLOBE_SIZE }}
                colorFilters={[...AUTH_GLOBE_ACCENT_FILTERS]}
              />
            </View>
          </View>
        </View>
      </View>

      <LinearGradient
        colors={[
          "rgba(245, 184, 76, 0)",
          "rgba(245, 184, 76, 0.65)",
          "rgba(245, 184, 76, 0)",
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.accentDivider}
      />

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: AUTH_CARD_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AUTH_COLORS.accentBorderMuted,
    backgroundColor: AUTH_COLORS.cardBgNeutral,
  },
  hero: {
    minHeight: HERO_MIN_HEIGHT,
    paddingVertical: HERO_PADDING_VERTICAL,
    alignItems: "center",
    justifyContent: "center",
  },
  beaconStage: {
    width: ORBIT_SIZE + 32,
    height: ORBIT_SIZE + 16,
    alignItems: "center",
    justifyContent: "center",
  },
  beaconGlow: {
    position: "absolute",
    width: 124,
    height: 124,
    borderRadius: 62,
  },
  orbitContainer: {
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  orbitArc: {
    position: "absolute",
    top: 0,
    left: 0,
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    borderRadius: ORBIT_SIZE / 2,
    borderWidth: 1,
    borderColor: "rgba(245, 184, 76, 0.35)",
    borderBottomColor: "transparent",
    borderLeftColor: "rgba(245, 184, 76, 0.12)",
    transform: [{ rotate: "-24deg" }],
  },
  orbitArcInner: {
    top: 9,
    left: 9,
    width: ORBIT_SIZE - 18,
    height: ORBIT_SIZE - 18,
    borderRadius: (ORBIT_SIZE - 18) / 2,
    borderColor: "rgba(245, 184, 76, 0.16)",
    borderBottomColor: "transparent",
    borderRightColor: "transparent",
    transform: [{ rotate: "18deg" }],
  },
  globeFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  bracketCorner: {
    position: "absolute",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
  },
  bracket: {
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: "rgba(245, 184, 76, 0.55)",
  },
  bracketFlipX: {
    borderLeftWidth: 0,
    borderRightWidth: 2,
  },
  bracketFlipY: {
    borderTopWidth: 0,
    borderBottomWidth: 2,
  },
  accentDivider: {
    height: 1,
    marginHorizontal: 28,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: AUTH_SPACING.cardPadding,
    paddingTop: 18,
    paddingBottom: AUTH_SPACING.cardPadding,
    gap: AUTH_SPACING.sectionGap,
  },
  title: {
    color: AUTH_COLORS.textPrimary,
    fontFamily: "Poppins-SemiBold",
    fontSize: AUTH_TYPOGRAPHY.title.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.title.lineHeight,
    textAlign: "center",
  },
  subtitle: {
    color: AUTH_COLORS.textMuted,
    fontFamily: "Poppins-Regular",
    fontSize: AUTH_TYPOGRAPHY.subtitle.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.subtitle.lineHeight,
    textAlign: "center",
    marginTop: -12,
  },
});
