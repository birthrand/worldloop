import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { prefetchCountryImage } from "@/components/explore/country-image";
import { FlagBadge } from "@/components/explore/flag-badge";
import { fetchCountryByName } from "@/lib/api";
import { formatPopulation, getCountryImages } from "@/lib/format-country";
import { mapCountryToCountry } from "@/lib/map-country";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country, MapCountry } from "@/types/country";

type MapCountryPreviewCardProps = {
  country: MapCountry;
  onNextCountry?: () => void;
  isNextCountryLoading?: boolean;
  onDismiss?: () => void;
};

const TITLE_FONT_SIZE = 16;
const TITLE_MIN_FONT_SIZE = 12;
const TITLE_CLOSE_SIZE = 32;
/** Compact inline flag — matches explore feed badge scale, leaves room for stats. */
const FLAG_WIDTH = 56;
const FLAG_HEIGHT = 38;
/** Capital at or above this length gets extra column width; others stay equal thirds. */
const CAPITAL_EXPAND_CHAR_THRESHOLD = 11;
const STAT_COLUMN_GAP = 12;

export function MapCountryPreviewCard({
  country,
  onNextCountry,
  isNextCountryLoading = false,
  onDismiss,
}: MapCountryPreviewCardProps) {
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);
  const isSaved = useSavedCountriesStore((s) => s.isSaved(country.name));

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

  const previewImages = useMemo(() => {
    if (!detail) return [];
    return getCountryImages(detail).slice(0, 3);
  }, [detail]);

  useEffect(() => {
    if (previewImages.length === 0) return;
    for (const uri of previewImages) {
      void prefetchCountryImage(uri);
    }
  }, [previewImages]);

  const aiFact =
    detail?.ai?.fact?.trim() ||
    (detailStatus === "loading"
      ? "Fun fact loading…"
      : detailStatus === "error"
        ? (detailError ?? "Fun fact unavailable")
        : "Fun fact loading…");

  return (
    <View style={styles.card}>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          {onDismiss ? <View style={styles.titleRowSide} /> : null}

          <Text
            style={styles.countryName}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={TITLE_MIN_FONT_SIZE / TITLE_FONT_SIZE}
            ellipsizeMode="tail"
          >
            {country.name}
          </Text>

          {onDismiss ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close country preview"
              onPress={onDismiss}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={18} color="#ffffff" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.flagWrap}>
            <FlagBadge
              flag={country.flag}
              width={FLAG_WIDTH}
              height={FLAG_HEIGHT}
            />
          </View>

          <View style={styles.statsColumn}>
            <View style={styles.statsRow}>
              <StatItem
                label={formatPopulation(country.population)}
                caption="Population"
              />
              <StatItem
                label={country.capital}
                caption="Capital"
                expandLabel={
                  country.capital.length >= CAPITAL_EXPAND_CHAR_THRESHOLD
                }
              />
              <StatItem label={country.region} caption="Region" />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.aiBlock}>
        <View className="flex-row items-center gap-1">
          <Ionicons name="bulb" size={16} color="#fbbf24" />
          <Text className="font-semibold text-sm text-tab-active">
            AI Fun Fact
          </Text>
          {detailStatus === "loading" ? (
            <ActivityIndicator size="small" color="#fbbf24" />
          ) : null}
        </View>
        <Text className="body-md text-white/85">{aiFact}</Text>
      </View>

      {/* <View style={styles.previewBlock}>
        <Text style={styles.previewTitle}>Top 3 posts</Text>
        {detailStatus === "loading" && previewImages.length === 0 ? (
          <View style={styles.previewSkeletonRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.previewSkeleton} />
            ))}
          </View>
        ) : null}
        {previewImages.length > 0 ? (
          <ScrollRowPreview
            images={previewImages}
            onPress={() => openCountryInExplore(countryForActions)}
          />
        ) : null}
      </View> */}

      {onNextCountry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next country"
          accessibilityState={{ disabled: isNextCountryLoading }}
          disabled={isNextCountryLoading}
          onPress={onNextCountry}
          style={({ pressed }) => [
            styles.nextCountryButton,
            (pressed || isNextCountryLoading) && styles.pressed,
          ]}
        >
          {isNextCountryLoading ? (
            <ActivityIndicator size="small" color="#fbbf24" />
          ) : (
            <Ionicons name="shuffle" size={18} color="#fbbf24" />
          )}
          <Text style={styles.nextCountryLabel}>Next country</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View full feed for ${country.name}`}
        onPress={() => openCountryInExplore(countryForActions)}
        style={({ pressed }) => [
          styles.exploreButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.exploreLabel}>View full feed</Text>
        {/* <Ionicons name="arrow-forward" size={20} color="#0b132b" /> */}
      </Pressable>
    </View>
  );
}

function StatItem({
  label,
  caption,
  expandLabel = false,
}: {
  label: string;
  caption: string;
  /** Long capital: slightly wider column + 2 lines; others stay equal width. */
  expandLabel?: boolean;
}) {
  return (
    <View style={[styles.statItem, expandLabel && styles.statItemWide]}>
      <Text
        style={styles.statLabel}
        numberOfLines={expandLabel ? 2 : 1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
      <Text style={styles.statCaption} numberOfLines={1}>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 32,
    marginBottom: 8,
    padding: 16,
    gap: 16,
    borderRadius: 24,
    backgroundColor: "rgba(18, 24, 38, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  headerBlock: {
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: TITLE_CLOSE_SIZE,
  },
  titleRowSide: {
    width: TITLE_CLOSE_SIZE,
    flexShrink: 0,
  },
  countryName: {
    flex: 1,
    minWidth: 0,
    fontSize: TITLE_FONT_SIZE,
    lineHeight: TITLE_CLOSE_SIZE,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
  closeButton: {
    width: TITLE_CLOSE_SIZE,
    height: TITLE_CLOSE_SIZE,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: TITLE_CLOSE_SIZE / 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  flagWrap: {
    width: FLAG_WIDTH,
    height: FLAG_HEIGHT,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  statsColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    minHeight: FLAG_HEIGHT,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: STAT_COLUMN_GAP,
  },
  statItem: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: 2,
  },
  statItemWide: {
    flex: 1.85,
    flexBasis: 0,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
  statCaption: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#94a3b8",
  },
  aiBlock: {
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  nextCountryButton: {
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  nextCountryLabel: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#fbbf24",
  },
  exploreButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fbbf24",
  },
  exploreLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#0b132b",
  },
  pressed: {
    opacity: 0.88,
  },
  previewBlock: {
    gap: 10,
  },
  previewTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "rgba(255,255,255,0.9)",
  },
  previewSkeletonRow: {
    flexDirection: "row",
    gap: 10,
  },
  previewSkeleton: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  previewRow: {
    gap: 10,
    alignItems: "center",
    paddingVertical: 2,
  },
  previewThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  previewThumb: {
    width: "100%",
    height: "100%",
  },
  previewTrailingPad: {
    width: 8,
  },
});

function ScrollRowPreview({
  images,
  onPress,
}: {
  images: string[];
  onPress: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.previewRow}
    >
      {images.map((uri) => (
        <Pressable
          key={uri}
          accessibilityRole="button"
          accessibilityLabel="Open country feed"
          onPress={onPress}
          style={({ pressed }) => [
            styles.previewThumbWrap,
            pressed && styles.pressed,
          ]}
        >
          <Image
            source={{ uri }}
            style={styles.previewThumb}
            contentFit="cover"
          />
        </Pressable>
      ))}
      <View style={styles.previewTrailingPad} />
    </ScrollView>
  );
}
