import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import {
  COUNTRY_DETAIL_HERO_BOTTOM_SCRIM_RATIO,
  COUNTRY_DETAIL_HERO_TOP_SCRIM_RATIO,
} from "@/constants/country-detail-layout";
import { EXPLORE_SWIPE_SCREEN_BG } from "@/constants/explore-swipe-layout";

const HERO_TOP_SCRIM_COLORS = [
  "rgba(0, 0, 0, 0.72)",
  "rgba(0, 0, 0, 0.42)",
  "rgba(0, 0, 0, 0)",
] as const;

const HERO_TOP_SCRIM_LOCATIONS = [0, 0.45, 1] as const;

const HERO_BOTTOM_SCRIM_COLORS = [
  EXPLORE_SWIPE_SCREEN_BG,
  EXPLORE_SWIPE_SCREEN_BG,
  "rgba(0, 0, 0, 0.92)",
  "rgba(0, 0, 0, 0.62)",
  "rgba(0, 0, 0, 0.28)",
  "rgba(0, 0, 0, 0)",
] as const;

const HERO_BOTTOM_SCRIM_LOCATIONS = [0, 0.14, 0.32, 0.52, 0.76, 1] as const;

type CountryHeroTopScrimProps = {
  height?: number;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function CountryHeroTopScrim({
  height,
  fill = false,
  style,
}: CountryHeroTopScrimProps) {
  if (!fill && (!height || height <= 0)) return null;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[...HERO_TOP_SCRIM_COLORS]}
      locations={[...HERO_TOP_SCRIM_LOCATIONS]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[
        styles.topScrim,
        fill ? styles.fill : { height: height ?? 0 },
        style,
      ]}
    />
  );
}

type CountryHeroBottomScrimProps = {
  height?: number;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function CountryHeroBottomScrim({
  height,
  fill = false,
  style,
}: CountryHeroBottomScrimProps) {
  if (!fill && (!height || height <= 0)) return null;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[...HERO_BOTTOM_SCRIM_COLORS]}
      locations={[...HERO_BOTTOM_SCRIM_LOCATIONS]}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={[
        styles.bottomScrim,
        fill ? styles.fill : { height: height ?? 0 },
        style,
      ]}
    />
  );
}

export function getCountryHeroTopScrimHeight(containerHeight: number): number {
  return Math.round(containerHeight * COUNTRY_DETAIL_HERO_TOP_SCRIM_RATIO);
}

export function getCountryHeroBottomScrimHeight(
  containerHeight: number,
): number {
  return Math.round(containerHeight * COUNTRY_DETAIL_HERO_BOTTOM_SCRIM_RATIO);
}

type CountryHeroScrimStackProps = {
  containerHeight: number;
};

/** Top + bottom hero fades sized from the hero container height. */
export function CountryHeroScrimStack({
  containerHeight,
}: CountryHeroScrimStackProps) {
  if (containerHeight <= 0) return null;

  return (
    <>
      <CountryHeroTopScrim
        height={getCountryHeroTopScrimHeight(containerHeight)}
      />
      <CountryHeroBottomScrim
        height={getCountryHeroBottomScrimHeight(containerHeight)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
