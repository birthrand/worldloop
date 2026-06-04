import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Divider } from "@/components/ai-explorer/divider";
import { StatItem } from "@/components/ai-explorer/stat-item";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { images } from "@/constants/images";
import { formatPopulation } from "@/lib/format-country";
import type { Country } from "@/types/country";

const MAP_SIZE = 112;

type CountryHeroCardProps = {
  country: Country;
  regionLabel: string;
  languagesLabel: string;
};

function GlobePreview() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.35, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));

  return (
    <View style={styles.globeWrap}>
      <Image
        source={images.earthMap}
        style={styles.globeImage}
        contentFit="cover"
        accessibilityLabel="Continent map preview"
      />
      <View style={styles.pinAnchor}>
        <Animated.View style={[styles.pinRing, ringStyle]} />
        <View style={styles.pinDot} />
      </View>
    </View>
  );
}

export function CountryHeroCard({
  country,
  regionLabel,
  languagesLabel,
}: CountryHeroCardProps) {
  return (
    <View style={styles.root}>
      <View style={styles.bodyRow}>
        <GlobePreview />

        <Divider vertical style={styles.mapDivider} />

        <View style={styles.statsGrid}>
          <View style={styles.gridRow}>
            <StatItem
              compact
              align="start"
              label="Population"
              value={formatPopulation(country.population)}
            />
            <Divider vertical />
            <StatItem
              compact
              align="start"
              label="Languages"
              value={languagesLabel}
            />
          </View>

          <Divider />

          <View style={styles.gridRow}>
            <StatItem
              compact
              align="start"
              label="Region"
              value={regionLabel}
            />
            <Divider vertical />
            <StatItem
              compact
              align="start"
              label="Capital"
              value={country.capital}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statsGrid: {
    flex: 1,
    minWidth: 0,
    height: MAP_SIZE,
  },
  gridRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  mapDivider: {
    height: MAP_SIZE,
  },
  globeWrap: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: AI_EXPLORER_THEME.divider,
    flexShrink: 0,
  },
  globeImage: {
    ...StyleSheet.absoluteFillObject,
  },
  pinAnchor: {
    position: "absolute",
    top: "38%",
    left: "42%",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pinRing: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: AI_EXPLORER_THEME.successMuted,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AI_EXPLORER_THEME.success,
  },
});
