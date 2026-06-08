import { Pressable, StyleSheet, Text, View } from "react-native";

import { ExploreActionRail } from "@/components/explore/explore-action-rail";
import { FlagBadge } from "@/components/explore/flag-badge";
import { formatPopulation } from "@/lib/format-country";
import type { Country } from "@/types/country";

const CARD_PADDING = 8;
const STAT_VALUE_LINE_HEIGHT = 16;
const STAT_LABEL_LINE_HEIGHT = 14;
const STAT_ITEM_GAP = 2;
const STAT_BLOCK_HEIGHT =
  STAT_VALUE_LINE_HEIGHT + STAT_ITEM_GAP + STAT_LABEL_LINE_HEIGHT;
const FLAG_HEIGHT = STAT_BLOCK_HEIGHT;
const FLAG_WIDTH = Math.round(FLAG_HEIGHT * 1.5);
const FACT_LINE_HEIGHT = 17;
const FACT_MAX_LINES = 3;

type ExploreCountryCardProps = {
  country: Country;
  fact: string;
  onPress?: () => void;
  onPressIn?: () => void;
};

type StatItemProps = {
  value: string;
  label: string;
};

function StatDivider() {
  return <View style={styles.statDivider} accessibilityElementsHidden />;
}

function StatItem({ value, label }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={styles.statValue}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {value}
      </Text>
    </View>
  );
}

export function ExploreCountryCard({
  country,
  fact,
  onPress,
  onPressIn,
}: ExploreCountryCardProps) {
  const capital = country.capital?.trim() || "—";

  const openDetails = onPress;
  const pressableProps = {
    accessibilityRole: "button" as const,
    accessibilityLabel: `${country.name} country details`,
    accessibilityHint: "Opens a detailed AI-powered country profile",
    onPress: openDetails,
    onPressIn,
    disabled: !openDetails,
  };

  return (
    <View style={styles.pressable}>
      <View style={styles.card}>
        <View style={styles.borderedContent}>
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

            <ExploreActionRail country={country} variant="header" />
          </View>

          <View style={styles.headerDivider} accessibilityElementsHidden />

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
              <StatDivider />
              <StatItem value={country.region || "—"} label="Region" />
              <StatDivider />
              <StatItem
                value={formatPopulation(country.population)}
                label="Population"
              />
              <StatDivider />
              <StatItem value={capital} label="Capital" />
            </View>
          </Pressable>

          <Pressable
            {...pressableProps}
            style={({ pressed }) => [
              pressed && openDetails ? styles.pressablePressed : null,
            ]}
          >
            <View style={styles.factSection}>
              <View style={styles.sectionDivider} accessibilityElementsHidden />
              <View style={styles.factHeader}>
                <Text style={styles.factLabel}>DID YOU KNOW?</Text>
              </View>
              <Text style={styles.factText} numberOfLines={FACT_MAX_LINES}>
                {fact}
              </Text>
            </View>
          </Pressable>
        </View>
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
    paddingBottom: 8,
    paddingHorizontal: CARD_PADDING,
  },
  borderedContent: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
    overflow: "hidden",
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    alignSelf: "stretch",
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
    gap: 10,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: STAT_BLOCK_HEIGHT,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    flexShrink: 0,
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
    fontSize: 12,
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
    paddingTop: 0,
    paddingBottom: 8,
    gap: 6,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    alignSelf: "stretch",
  },
  factHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
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
    lineHeight: FACT_LINE_HEIGHT,
    minHeight: FACT_LINE_HEIGHT * FACT_MAX_LINES,
    color: "rgba(255, 255, 255, 0.88)",
  },
});
