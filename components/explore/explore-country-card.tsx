import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { ExploreActionRail } from "@/components/explore/explore-action-rail";
import { FlagBadge } from "@/components/explore/flag-badge";
import { formatPopulation } from "@/lib/format-country";
import type { Country } from "@/types/country";

const CARD_PADDING = 16;
/** Extra space above content so the gradient can fade in from the hero image. */
const FADE_HEADROOM = 48;
const STAT_VALUE_LINE_HEIGHT = 18;
const STAT_LABEL_LINE_HEIGHT = 14;
const STAT_ITEM_GAP = 2;
const STAT_BLOCK_HEIGHT =
  STAT_VALUE_LINE_HEIGHT + STAT_ITEM_GAP + STAT_LABEL_LINE_HEIGHT;
const FLAG_HEIGHT = STAT_BLOCK_HEIGHT;
const FLAG_WIDTH = Math.round(FLAG_HEIGHT * 1.5);
type GradientViewStyle = {
  experimental_backgroundImage: string;
};

const CARD_FADE_GRADIENT =
  "linear-gradient(to top, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0.94) 28%, rgba(0, 0, 0, 0.72) 52%, rgba(0, 0, 0, 0.38) 76%, rgba(0, 0, 0, 0) 100%)";

type ExploreCountryCardProps = {
  country: Country;
  fact: string;
  imageIndex?: number;
  imageCount?: number;
  onPress?: () => void;
};

type StatItemProps = {
  value: string;
  label: string;
};

function StatItem({ value, label }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statValue} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  );
}

export function ExploreCountryCard({
  country,
  fact,
  imageIndex = 0,
  imageCount = 1,
  onPress,
}: ExploreCountryCardProps) {
  const factOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    factOpacity.setValue(0);
    const animation = Animated.timing(factOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fact, factOpacity]);

  const capital = country.capital?.trim() || "—";

  const openDetails = onPress;
  const pressableProps = {
    accessibilityRole: "button" as const,
    accessibilityLabel: `${country.name} country details`,
    accessibilityHint: "Opens a detailed AI-powered country profile",
    onPress: openDetails,
    disabled: !openDetails,
  };

  return (
    <View style={styles.pressable}>
      <View
        style={[
          styles.card,
          {
            experimental_backgroundImage: CARD_FADE_GRADIENT,
          } satisfies GradientViewStyle,
        ]}
      >
        <View style={styles.topSection}>
          <View style={styles.titleRow}>
            <Pressable
              {...pressableProps}
              style={({ pressed }) => [
                styles.countryNameWrap,
                pressed && openDetails ? styles.pressablePressed : null,
              ]}
            >
              <Text
                style={styles.countryName}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {country.name}
              </Text>
            </Pressable>

            <ExploreActionRail
              country={country}
              variant="header"
              imageIndex={imageIndex}
              imageCount={imageCount}
            />
          </View>

          <Pressable
            {...pressableProps}
            style={({ pressed }) => [
              pressed && openDetails ? styles.pressablePressed : null,
            ]}
          >
            <View style={styles.statsRow}>
              <View style={styles.flagCell}>
                <FlagBadge
                  flag={country.flag}
                  iso2={country.cca2}
                  width={FLAG_WIDTH}
                  height={FLAG_HEIGHT}
                />
              </View>
              <StatItem value={country.region || "—"} label="Region" />
              <StatItem
                value={formatPopulation(country.population)}
                label="Population"
              />
              <StatItem value={capital} label="Capital" />
            </View>
          </Pressable>
        </View>

        <Pressable
          {...pressableProps}
          style={({ pressed }) => [
            pressed && openDetails ? styles.pressablePressed : null,
          ]}
        >
          <Animated.View style={[styles.factSection, { opacity: factOpacity }]}>
            <View style={styles.factHeader}>
              <Text style={styles.factLabel}>DID YOU KNOW?</Text>
            </View>
            <Text style={styles.factText}>{fact}</Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "stretch",
  },
  pressablePressed: {
    opacity: 0.92,
  },
  card: {
    paddingTop: FADE_HEADROOM,
    paddingBottom: 8,
    paddingHorizontal: CARD_PADDING,
    gap: 12,
  },
  topSection: {
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryNameWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  countryName: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    lineHeight: 24,
    color: "#ffffff",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flagCell: {
    height: STAT_BLOCK_HEIGHT,
    justifyContent: "center",
  },
  statItem: {
    flex: 1,
    minWidth: 0,
    gap: STAT_ITEM_GAP,
  },
  statValue: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    lineHeight: STAT_VALUE_LINE_HEIGHT,
    color: "#ffffff",
  },
  statLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    lineHeight: STAT_LABEL_LINE_HEIGHT,
    color: "rgba(255, 255, 255, 0.55)",
  },
  factSection: {
    alignSelf: "stretch",
    paddingTop: 8,
    paddingBottom: 12,
  },
  factHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  factLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: "rgba(255, 255, 255, 0.45)",
  },
  factText: {
    alignSelf: "stretch",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 17,
    color: "rgba(255, 255, 255, 0.88)",
    // textAlign: "justify",
  },
});
