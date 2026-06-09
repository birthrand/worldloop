import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ExploreActionRail } from "@/components/explore/explore-action-rail";
import { FlagBadge } from "@/components/explore/flag-badge";
import { COMPACT_TOUCH_SIZE } from "@/components/explore/glass-icon-button";
import {
  EXPLORE_FEED_CARD_HORIZONTAL_PADDING,
  EXPLORE_FEED_CARD_SURFACE,
} from "@/constants/explore-feed-layout";
import { continentDisplayLabel } from "@/constants/regions";
import type { Country } from "@/types/country";

const STAT_VALUE_LINE_HEIGHT = 16;
const STAT_LABEL_LINE_HEIGHT = 12;
const STAT_ITEM_GAP = 3;
const STAT_SINGLE_LINE_HEIGHT =
  STAT_LABEL_LINE_HEIGHT + STAT_ITEM_GAP + STAT_VALUE_LINE_HEIGHT;
const FLAG_STATS_EXTRA_GAP = 4;
const STATS_ROW_GAP = 10;
const STATS_ROW_GAP_COMPACT = 20;
const LONG_STAT_VALUE_CHAR_THRESHOLD = 12;
const FLAG_ASPECT_RATIO = 1.5;
/** Matches header rail pill: compact touch target + vertical padding. */
const ACTION_RAIL_BLOCK_HEIGHT = COMPACT_TOUCH_SIZE + 8;

function getInfoFlagSize() {
  const height = STAT_SINGLE_LINE_HEIGHT;
  return { height, width: Math.round(height * FLAG_ASPECT_RATIO) };
}

function usesExpandedStatsLayout(regionDisplay: string, capital: string) {
  return (
    regionDisplay.length >= LONG_STAT_VALUE_CHAR_THRESHOLD ||
    capital.length >= LONG_STAT_VALUE_CHAR_THRESHOLD
  );
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
  layout?: "even" | "content" | "expand";
};

function StatItem({
  label,
  value,
  emphasis = "secondary",
  layout = "even",
}: StatItemProps) {
  const isPrimary = emphasis === "primary";

  return (
    <View
      style={[
        styles.statItem,
        layout === "content"
          ? styles.statItemContent
          : layout === "expand"
            ? styles.statItemExpand
            : styles.statItemEven,
      ]}
    >
      <Text
        style={[styles.statLabel, isPrimary ? styles.statLabelPrimary : null]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[styles.statValue, isPrimary ? styles.statValuePrimary : null]}
        numberOfLines={1}
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
  const openDetails = onPress;
  const flagSize = getInfoFlagSize();
  const isExpandedStats = usesExpandedStatsLayout(regionDisplay, capital);

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
                    !isExpandedStats ? styles.statsRowCompact : null,
                  ]}
                >
                  <StatItem
                    value={regionDisplay}
                    label="Region"
                    layout="content"
                  />
                  <StatItem
                    value={capital}
                    label="Capital"
                    emphasis="primary"
                    layout={isExpandedStats ? "expand" : "content"}
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
              style={({ pressed }) => [
                styles.factSection,
                pressed && openDetails ? styles.factSectionPressed : null,
              ]}
            >
              <View style={styles.factHeaderBand}>
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
              <View style={styles.factBody}>
                <Text style={styles.factText} numberOfLines={FACT_MAX_LINES}>
                  {fact}
                </Text>
              </View>
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
    paddingBottom: 18,
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
    alignItems: "center",
    gap: 6,
  },
  flagCell: {
    flexShrink: 0,
    alignSelf: "center",
    marginRight: FLAG_STATS_EXTRA_GAP,
  },
  railCell: {
    flexShrink: 0,
    alignSelf: "center",
  },
  statsRow: {
    flex: 1,
    minWidth: 0,
    minHeight: ACTION_RAIL_BLOCK_HEIGHT,
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: STATS_ROW_GAP,
  },
  statsRowCompact: {
    gap: STATS_ROW_GAP_COMPACT,
    justifyContent: "flex-start",
  },
  statItem: {
    gap: STAT_ITEM_GAP,
    justifyContent: "center",
  },
  statItemEven: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  statItemContent: {
    flexGrow: 0,
    flexShrink: 0,
  },
  statItemExpand: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
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
  factSectionPressed: {
    opacity: 0.72,
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
  factBody: {
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 11,
    backgroundColor: FACT_BODY_BG,
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
