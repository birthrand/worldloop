import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { continentDisplayLabel } from "@/constants/regions";
import { fetchCountryByName } from "@/lib/api";
import { formatPopulation } from "@/lib/format-country";
import { mapCountryToCountry } from "@/lib/map-country";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import type { Country, MapCountry } from "@/types/country";

type MapCountryPreviewCardProps = {
  country: MapCountry;
  onNextCountry?: () => void;
  isNextCountryLoading?: boolean;
  onDismiss: () => void;
  onBackToContinent?: () => void;
  backToRegionLabel?: string;
  bottomInset?: number;
};

const FLAG_WIDTH = 56;
const FLAG_HEIGHT = 38;
const COUNTRY_NAME_FONT_SIZE = 17;
const COUNTRY_NAME_MIN_FONT_SIZE = 14;

export function MapCountryPreviewCard({
  country,
  onNextCountry,
  isNextCountryLoading = false,
  onDismiss,
  onBackToContinent,
  backToRegionLabel,
  bottomInset = 0,
}: MapCountryPreviewCardProps) {
  const [detail, setDetail] = useState<Country | null>(null);
  const [detailStatus, setDetailStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setDetailStatus("loading");
    setDetailError(null);

    void fetchCountryByName(country.name)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setDetailStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailStatus("error");
        setDetailError(
          err instanceof Error ? err.message : "Could not load fun fact",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [country.name]);

  const countryForActions = mapCountryToCountry(country, detail);

  const funFact =
    detail?.ai?.fact?.trim() ||
    (detailStatus === "loading"
      ? "Loading…"
      : detailStatus === "error"
        ? (detailError ?? "Unavailable right now")
        : "Loading…");

  return (
    <View style={[styles.card, { paddingBottom: 12 + bottomInset }]}>
      <View style={styles.topRow}>
        <View style={styles.titleTextWrap}>
          <Text
            style={styles.countryName}
            numberOfLines={2}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={
              COUNTRY_NAME_MIN_FONT_SIZE / COUNTRY_NAME_FONT_SIZE
            }
          >
            {country.name}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close country preview"
          onPress={onDismiss}
          hitSlop={8}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}
        >
          <Ionicons name="close" size={20} color="#94a3b8" />
        </Pressable>
      </View>

      <View style={styles.sectionDivider} />

      <View style={styles.metaRow}>
        <View style={styles.flagWrap}>
          <FlagBadge
            flag={country.flag}
            width={FLAG_WIDTH}
            height={FLAG_HEIGHT}
          />
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statsRow}>
          <Stat
            caption="Population"
            value={formatPopulation(country.population)}
            valueLines={1}
          />
          <View style={styles.statDivider} />
          <Stat
            caption="Capital"
            value={country.capital || "—"}
            flex={1.4}
            valueLines={3}
          />
          <View style={styles.statDivider} />
          <Stat
            caption="Continent"
            value={continentDisplayLabel(country.region)}
            valueLines={2}
          />
        </View>
      </View>

      <View style={styles.sectionDivider} />

      <View style={styles.factBlock}>
        <View style={styles.factLabelRow}>
          <Text style={styles.factLabel}>Fun fact</Text>
          {detailStatus === "loading" ? (
            <ActivityIndicator size="small" color="#94a3b8" />
          ) : null}
        </View>
        <Text
          style={[
            styles.factText,
            detailStatus === "error" && styles.factTextMuted,
          ]}
        >
          {funFact}
        </Text>
      </View>

      <View style={styles.sectionDivider} />

      <View style={styles.actionStack}>
        {onBackToContinent ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                backToRegionLabel
                  ? `Back to ${backToRegionLabel}`
                  : "Back to continent"
              }
              onPress={onBackToContinent}
              style={({ pressed }) => [
                styles.actionSegment,
                styles.backSegment,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="arrow-back" size={16} color="#ffffff" />
              {backToRegionLabel ? (
                <Text style={styles.actionLabel} numberOfLines={1}>
                  {backToRegionLabel}
                </Text>
              ) : null}
            </Pressable>
            <View style={styles.actionDivider} />
          </>
        ) : null}

        {onNextCountry ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Shuffle to another country"
              accessibilityState={{ disabled: isNextCountryLoading }}
              disabled={isNextCountryLoading}
              onPress={onNextCountry}
              style={({ pressed }) => [
                styles.actionSegment,
                isNextCountryLoading && styles.actionLoading,
                pressed && !isNextCountryLoading && styles.pressed,
              ]}
            >
              {isNextCountryLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="shuffle" size={18} color="#ffffff" />
              )}
              <Text style={styles.actionLabel}>Shuffle</Text>
            </Pressable>
            <View style={styles.actionDivider} />
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${country.name} in Explore`}
          onPress={() => openCountryInExplore(countryForActions)}
          style={({ pressed }) => [
            styles.actionSegment,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.actionLabel}>Explore</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

function Stat({
  caption,
  value,
  flex = 1,
  valueLines = 1,
}: {
  caption: string;
  value: string;
  flex?: number;
  valueLines?: number;
}) {
  return (
    <View style={[styles.stat, { flex }]}>
      <Text style={styles.statCaption} numberOfLines={1} ellipsizeMode="tail">
        {caption}
      </Text>
      <Text
        style={styles.statValue}
        numberOfLines={valueLines}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#121826",
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  topRow: {
    flexDirection: "row",
    // justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  countryName: {
    fontSize: COUNTRY_NAME_FONT_SIZE,
    lineHeight: 21,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  closeButton: {
    width: 32,
    height: 32,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    opacity: 0.6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  flagWrap: {
    flexShrink: 0,
    marginTop: 1,
  },
  statsRow: {
    flex: 1,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "stretch",
    minWidth: 0,
  },
  statDivider: {
    width: 1,
    flexShrink: 0,
    alignSelf: "stretch",
    marginHorizontal: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  stat: {
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
    overflow: "hidden",
  },
  statCaption: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: "Poppins-Regular",
    color: "#94a3b8",
  },
  statValue: {
    fontSize: 14,
    lineHeight: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    flexShrink: 1,
  },
  factBlock: {
    gap: 4,
  },
  factLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  factLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  factText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.9)",
  },
  factTextMuted: {
    color: "#94a3b8",
  },
  actionStack: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  actionSegment: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
  },
  backSegment: {
    flex: 0.85,
    minWidth: 44,
  },
  actionDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
  actionLoading: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.95,
    backgroundColor: "#29303C",
  },
});
