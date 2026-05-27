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
};

export function MapCountryPreviewCard({
  country,
  onNextCountry,
  isNextCountryLoading = false,
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
      <View className="flex-row gap-3">
        <View style={styles.thumbnailWrap}>
          <View style={[styles.thumbnail, styles.thumbnailFallback]}>
            <FlagBadge flag={country.flag} width={88} height={64} />
          </View>
        </View>

        <View className="min-w-0 flex-1 gap-2 justify-center">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-2">
              {/* <FlagBadge flag={country.flag} width={28} height={20} /> */}
              <Text
                className="font-semibold text-[18px] text-white"
                numberOfLines={1}
              >
                {country.name}
              </Text>
            </View>

            {/* <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isSaved ? `Unsave ${country.name}` : `Save ${country.name}`
              }
              onPress={() => toggleSaved(countryForActions)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isSaved ? "#fbbf24" : "#ffffff"}
              />
            </Pressable> */}
          </View>

          <View className="flex-row gap-2">
            <StatItem
              // icon="people-outline"
              label={formatPopulation(country.population)}
              caption="Population"
            />
            <StatItem
              // icon="location-outline"
              label={country.capital}
              caption="Capital"
              expandLabel
            />
            <StatItem
              // icon="globe-outline"
              label={country.region}
              caption="Region"
            />
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
  icon,
  label,
  caption,
  expandLabel = false,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  caption: string;
  /** Capital: grow to fit full label; other stats stay equal-width and truncate. */
  expandLabel?: boolean;
}) {
  return (
    <View style={[styles.statItem, expandLabel && styles.statItemExpand]}>
      {icon ? <Ionicons name={icon} size={14} color="#94a3b8" /> : null}
      <Text
        style={styles.statLabel}
        numberOfLines={expandLabel ? undefined : 1}
      >
        {label}
      </Text>
      <Text style={styles.statCaption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 32,
    marginBottom: 136,
    padding: 16,
    gap: 16,
    borderRadius: 24,
    backgroundColor: "rgba(18, 24, 38, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  thumbnailWrap: {
    width: 88,
    height: 64,
    // borderRadius: 16,
    overflow: "hidden",
  },
  thumbnail: {
    width: 88,
    height: 64,
  },
  thumbnailFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  saveButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  statItem: {
    flex: 1,
    minWidth: 0,
  },
  statItemExpand: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    minWidth: undefined,
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
