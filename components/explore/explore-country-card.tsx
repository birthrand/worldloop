import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ExploreActionRail } from "@/components/explore/explore-action-rail";
import { FlagBadge } from "@/components/explore/flag-badge";
import {
  EXPLORE_FEED_CARD_HORIZONTAL_PADDING,
  EXPLORE_FEED_CARD_SURFACE,
} from "@/constants/explore-feed-layout";
import { continentDisplayLabel } from "@/constants/regions";
import { formatPopulation } from "@/lib/format-country";
import type { Country } from "@/types/country";

const STAT_VALUE_LINE_HEIGHT = 16;
const STAT_LABEL_LINE_HEIGHT = 12;
const STAT_ITEM_GAP = 3;
const STAT_SINGLE_LINE_HEIGHT =
  STAT_LABEL_LINE_HEIGHT + STAT_ITEM_GAP + STAT_VALUE_LINE_HEIGHT;
const FLAG_STATS_EXTRA_GAP = 4;
const STATS_ROW_GAP = 10;
const LONG_CAPITAL_CHAR_THRESHOLD = 12;
const FLAG_ASPECT_RATIO = 1.5;
const FLAG_ASPECT_RATIO_MULTILINE = 1.28;

function getStatsBlockHeight(capitalValueLines: 1 | 2): number {
  return capitalValueLines === 2
    ? STAT_LABEL_LINE_HEIGHT + STAT_ITEM_GAP + STAT_VALUE_LINE_HEIGHT * 2
    : STAT_SINGLE_LINE_HEIGHT;
}

function getInfoFlagSize(capitalValueLines: 1 | 2) {
  const height = getStatsBlockHeight(capitalValueLines);
  const aspectRatio =
    capitalValueLines === 2 ? FLAG_ASPECT_RATIO_MULTILINE : FLAG_ASPECT_RATIO;

  return {
    height,
    width: Math.round(height * aspectRatio),
  };
}

/** Ensures uppercase stat labels (especially "Population") are not truncated. */
function getLabelMinFlex(label: string): number {
  return label.length / 9;
}

function getValueMinFlex(
  value: string,
  options?: { wrapped?: boolean },
): number {
  const divisor = options?.wrapped ? 14 : 8;
  return value.length / divisor;
}

function getStatsColumnFlex(
  region: string,
  population: string,
  capital: string,
  capitalValueLines: 1 | 2,
) {
  const regionDisplay = continentDisplayLabel(region);

  return {
    region: Math.max(getValueMinFlex(regionDisplay), getLabelMinFlex("Region")),
    population: Math.max(
      getValueMinFlex(population),
      getLabelMinFlex("Population"),
    ),
    capital: Math.max(
      getValueMinFlex(capital, { wrapped: capitalValueLines === 2 }),
      getLabelMinFlex("Capital"),
    ),
  };
}

function getCapitalValueLines(capital: string): 1 | 2 {
  return capital.length > LONG_CAPITAL_CHAR_THRESHOLD ? 2 : 1;
}
const FACT_LINE_HEIGHT = 17;
const FACT_MAX_LINES = 3;
const FACT_HEADER_BG = "rgba(255, 255, 255, 0.085)";
const FACT_BODY_BG = "rgba(255, 255, 255, 0.04)";
const FACT_LABEL_COLOR = "rgba(255, 255, 255, 0.62)";
const FACT_ICON_COLOR = "rgba(255, 255, 255, 0.52)";
const FACT_CHEVRON_COLOR = "rgba(255, 255, 255, 0.42)";

type ExploreCountryCardProps = {
  country: Country;
  fact: string;
  onPress?: () => void;
  onPressIn?: () => void;
};

type StatItemProps = {
  label: string;
  value: string;
  emphasis?: "primary" | "secondary";
  flex?: number;
  valueLines?: 1 | 2;
};

function StatItem({
  label,
  value,
  emphasis = "secondary",
  flex = 1,
  valueLines = 1,
}: StatItemProps) {
  const isPrimary = emphasis === "primary";

  return (
    <View style={[styles.statItem, { flex }]}>
      <Text
        style={[styles.statLabel, isPrimary ? styles.statLabelPrimary : null]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
      <Text
        style={[
          styles.statValue,
          isPrimary ? styles.statValuePrimary : null,
          valueLines === 2 ? styles.statValueMultiline : null,
        ]}
        numberOfLines={valueLines}
        ellipsizeMode="tail"
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
  const region = country.region?.trim() || "—";
  const regionDisplay = continentDisplayLabel(region);
  const population = formatPopulation(country.population);
  const openDetails = onPress;
  const capitalValueLines = getCapitalValueLines(capital);
  const statFlex = getStatsColumnFlex(
    region,
    population,
    capital,
    capitalValueLines,
  );
  const flagSize = getInfoFlagSize(capitalValueLines);

  return (
    <View style={styles.pressable}>
      <View style={styles.card}>
        <View style={styles.cardSurface}>
          <View style={styles.cardContent}>
            <View style={styles.countryInfoSection}>
              <Text
                style={styles.countryName}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {country.name}
              </Text>

              <View style={styles.countryInfoRow}>
                <View style={styles.flagCell}>
                  <FlagBadge
                    flag={country.flag}
                    iso2={country.cca2}
                    width={flagSize.width}
                    height={flagSize.height}
                  />
                </View>

                <View
                  style={[
                    styles.statsRow,
                    capitalValueLines === 2 ? styles.statsRowTop : null,
                  ]}
                >
                  <StatItem
                    value={regionDisplay}
                    label="Region"
                    flex={statFlex.region}
                  />
                  <StatItem
                    value={population}
                    label="Population"
                    emphasis="primary"
                    flex={statFlex.population}
                  />
                  <StatItem
                    value={capital}
                    label="Capital"
                    flex={statFlex.capital}
                    valueLines={capitalValueLines}
                  />
                </View>

                <View style={styles.railCell}>
                  <ExploreActionRail country={country} variant="header" />
                </View>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Did you know about ${country.name}`}
              accessibilityHint="Opens a detailed AI-powered country profile"
              onPress={openDetails}
              onPressIn={onPressIn}
              disabled={!openDetails}
              style={styles.factSection}
            >
              {({ pressed }) => (
                <>
                  <View
                    style={[
                      styles.factHeaderBand,
                      pressed && openDetails
                        ? styles.factHeaderBandPressed
                        : null,
                    ]}
                  >
                    <View style={styles.factLabelGroup}>
                      <Ionicons
                        name="bulb-outline"
                        size={12}
                        color={FACT_ICON_COLOR}
                      />
                      <Text style={styles.factLabel}>DID YOU KNOW?</Text>
                    </View>
                    {openDetails ? (
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={FACT_CHEVRON_COLOR}
                      />
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.factBody,
                      pressed && openDetails ? styles.factBodyPressed : null,
                    ]}
                  >
                    <Text
                      style={styles.factText}
                      numberOfLines={FACT_MAX_LINES}
                    >
                      {fact}
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "stretch",
  },
  card: {
    width: "100%",
  },
  cardSurface: {
    alignSelf: "stretch",
    overflow: "hidden",
    backgroundColor: EXPLORE_FEED_CARD_SURFACE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  cardContent: {
    paddingHorizontal: EXPLORE_FEED_CARD_HORIZONTAL_PADDING,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  countryInfoSection: {
    gap: 8,
  },
  countryName: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: "#ffffff",
  },
  countryInfoRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  flagCell: {
    flexShrink: 0,
    alignSelf: "stretch",
    justifyContent: "center",
    marginRight: FLAG_STATS_EXTRA_GAP,
  },
  railCell: {
    alignSelf: "center",
    flexShrink: 0,
  },
  statsRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: STATS_ROW_GAP,
  },
  statsRowTop: {
    alignItems: "flex-start",
  },
  statItem: {
    minWidth: 0,
    gap: STAT_ITEM_GAP,
    justifyContent: "center",
  },
  statLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 9,
    lineHeight: STAT_LABEL_LINE_HEIGHT,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.42)",
  },
  statLabelPrimary: {
    color: "rgba(255, 255, 255, 0.52)",
  },
  statValue: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    lineHeight: STAT_VALUE_LINE_HEIGHT,
    color: "rgba(255, 255, 255, 0.82)",
  },
  statValuePrimary: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    lineHeight: STAT_VALUE_LINE_HEIGHT,
    color: "#ffffff",
  },
  statValueMultiline: {
    minHeight: STAT_VALUE_LINE_HEIGHT * 2,
  },
  factSection: {
    alignSelf: "stretch",
    overflow: "hidden",
    minHeight: 44,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.38,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  factHeaderBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: FACT_HEADER_BG,
  },
  factHeaderBandPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  factBody: {
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 11,
    backgroundColor: FACT_BODY_BG,
  },
  factBodyPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  factLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  factLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.05,
    color: FACT_LABEL_COLOR,
  },
  factText: {
    alignSelf: "stretch",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: FACT_LINE_HEIGHT,
    minHeight: FACT_LINE_HEIGHT * FACT_MAX_LINES,
    color: "rgba(255, 255, 255, 0.82)",
  },
});
