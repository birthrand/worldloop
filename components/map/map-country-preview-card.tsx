import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

import { FlagBadge } from "@/components/explore/flag-badge";
import { AI_EXPLORER_THEME } from "@/constants/ai-explorer-theme";
import { CLIENT_CACHE_KEYS, CLIENT_CACHE_TTL } from "@/constants/client-cache";
import { continentDisplayLabel } from "@/constants/regions";
import { fetchCountryByName } from "@/lib/api";
import { getClientCache, staleWhileRevalidate } from "@/lib/client-cache";
import { formatPopulation } from "@/lib/format-country";
import { mapCountryToCountry } from "@/lib/map-country";
import { openCountryAiExplorer } from "@/lib/open-country-ai-explorer";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import { prefetchCountryProfile } from "@/lib/prefetch-country-profiles";
import { useSpatialContextStore } from "@/store/use-spatial-context-store";
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
const COUNTRY_NAME_LINE_HEIGHT = 20;
const COUNTRY_NAME_MIN_FONT_SIZE = 14;
const ACCENT = "#fbbf24";
const ACCENT_DARK = "#0b132b";

const PREVIEW_CARD_ENTER = SlideInDown.springify()
  .damping(20)
  .stiffness(150)
  .mass(0.85);

const PREVIEW_CARD_EXIT = SlideOutDown.springify()
  .damping(24)
  .stiffness(200)
  .mass(0.75);

export function MapCountryPreviewCard({
  country,
  onNextCountry,
  isNextCountryLoading = false,
  onDismiss,
  onBackToContinent,
  backToRegionLabel,
  bottomInset = 0,
}: MapCountryPreviewCardProps) {
  const discoveryScopeMode = useSpatialContextStore(
    (s) => s.discoveryScope.mode,
  );
  const queueLength = useSpatialContextStore((s) => s.queue.length);
  const [detail, setDetail] = useState<Country | null>(null);
  const [detailStatus, setDetailStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      setDetailError(null);

      const cacheKey = CLIENT_CACHE_KEYS.countryDetail(country.name);
      const diskCache = await getClientCache<Country>(cacheKey);

      if (cancelled) return;

      if (diskCache.data) {
        setDetail(diskCache.data);
        setDetailStatus("idle");
      } else {
        setDetail(null);
        setDetailStatus("loading");
      }

      try {
        await staleWhileRevalidate({
          key: cacheKey,
          ttlSeconds: CLIENT_CACHE_TTL.countryDetail,
          fetcher: () => fetchCountryByName(country.name),
          onCached: (data) => {
            if (cancelled) return;
            setDetail(data);
            setDetailStatus("idle");
          },
          onFetched: (data) => {
            if (cancelled) return;
            setDetail(data);
            setDetailStatus("idle");
          },
        });
      } catch (err) {
        if (cancelled) return;
        if (!diskCache.data) {
          setDetailStatus("error");
          setDetailError(
            err instanceof Error ? err.message : "Could not load fun fact",
          );
        }
      }
    };

    void loadDetail();
    void prefetchCountryProfile(country.name);

    return () => {
      cancelled = true;
    };
  }, [country.name]);

  const detailMatchesCountry = detail?.name === country.name;
  const countryForActions = mapCountryToCountry(
    country,
    detailMatchesCountry ? detail : null,
  );

  const funFact =
    (detailMatchesCountry ? detail?.ai?.fact?.trim() : undefined) ||
    (detailStatus === "loading"
      ? detailMatchesCountry || !detail
        ? "Loading…"
        : "Updating…"
      : detailStatus === "error"
        ? (detailError ?? "Unavailable right now")
        : "Updating…");

  return (
    <Animated.View
      entering={PREVIEW_CARD_ENTER}
      exiting={PREVIEW_CARD_EXIT}
      style={[
        styles.card,
        { paddingBottom: bottomInset > 0 ? bottomInset : 16 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleTextWrap}>
          <Text
            style={styles.countryName}
            numberOfLines={3}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={
              COUNTRY_NAME_MIN_FONT_SIZE / COUNTRY_NAME_FONT_SIZE
            }
          >
            {country.name}
          </Text>
        </View>

        <View style={styles.closeSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close country preview"
            onPress={onDismiss}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </Pressable>
        </View>
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open AI insights for ${country.name}`}
        onPress={() => openCountryAiExplorer(countryForActions)}
        style={({ pressed }) => [
          styles.insightsButton,
          pressed && styles.insightsButtonPressed,
        ]}
      >
        <Ionicons name="sparkles" size={16} color={AI_EXPLORER_THEME.accent} />
        <Text style={styles.insightsLabel}>AI Country Explorer</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={AI_EXPLORER_THEME.textMuted}
        />
      </Pressable>

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
              accessibilityHint="Picks another country in this region and flies the map there"
              accessibilityState={{ disabled: isNextCountryLoading }}
              disabled={isNextCountryLoading}
              onPress={onNextCountry}
              style={({ pressed }) => [
                styles.actionSegment,
                isNextCountryLoading && styles.actionLoading,
                pressed && !isNextCountryLoading && styles.pressed,
              ]}
            >
              <Ionicons name="shuffle" size={18} color="#ffffff" />
              <Text style={styles.actionLabel}>Shuffle</Text>
            </Pressable>
            <View style={styles.actionDivider} />
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${country.name} in Explore`}
          onPress={() =>
            openCountryInExplore(
              countryForActions,
              discoveryScopeMode === "here" && queueLength > 0
                ? {
                    mode: "here",
                    preserveHereMode: true,
                    preserveQueue: true,
                  }
                : undefined,
            )
          }
          style={({ pressed }) => [
            styles.actionSegment,
            styles.exploreSegment,
            pressed && styles.explorePressed,
          ]}
        >
          <Text style={styles.exploreLabel}>Explore</Text>
          <Ionicons name="arrow-forward" size={16} color={ACCENT_DARK} />
        </Pressable>
      </View>
    </Animated.View>
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
    marginBottom: -80,
    paddingHorizontal: 16,
    gap: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#121826",
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.38,
        shadowRadius: 18,
      },
      android: {
        elevation: 16,
      },
      default: {},
    }),
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    // marginVertical: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  titleTextWrap: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  countryName: {
    fontSize: COUNTRY_NAME_FONT_SIZE,
    lineHeight: COUNTRY_NAME_LINE_HEIGHT,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  closeSlot: {
    height: COUNTRY_NAME_LINE_HEIGHT,
    width: 28,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: COUNTRY_NAME_LINE_HEIGHT,
    height: COUNTRY_NAME_LINE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  closeButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    opacity: 0.85,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    // marginVertical: 4,
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
    fontFamily: "Poppins-Regular",
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
  insightsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: AI_EXPLORER_THEME.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AI_EXPLORER_THEME.divider,
  },
  insightsButtonPressed: {
    opacity: 0.92,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  insightsLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: AI_EXPLORER_THEME.textPrimary,
  },
  actionStack: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 4,
    minHeight: 48,
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
  exploreSegment: {
    backgroundColor: ACCENT,
  },
  exploreLabel: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: ACCENT_DARK,
  },
  explorePressed: {
    opacity: 0.88,
    backgroundColor: "#f59e0b",
  },
  actionLoading: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.95,
    backgroundColor: "#29303C",
  },
});
