import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import {
  formatPopulation,
  getAiFact,
  getCountryImages,
} from "@/lib/format-country";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import { useSavedCountriesStore } from "@/store/use-saved-countries-store";
import type { Country } from "@/types/country";

const PLACEHOLDER_DESCRIPTION =
  "Land of ancient wonders, vibrant culture, and breathtaking landscapes.";

type CountryOfTheDayCardProps = {
  country?: Country;
  loading?: boolean;
};

function truncateDescription(text: string, maxLength = 90): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function CountryOfTheDayCard({
  country,
  loading = false,
}: CountryOfTheDayCardProps) {
  const isSaved = useSavedCountriesStore((s) =>
    country ? s.isSaved(country.name) : false,
  );
  const toggleSaved = useSavedCountriesStore((s) => s.toggleSaved);

  if (loading) {
    return (
      <View className="h-[360px] items-center justify-center overflow-hidden rounded-3xl bg-white/6">
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  const images = country ? getCountryImages(country) : [];
  const heroUri = images[0];
  const description = country
    ? truncateDescription(
        getAiFact(country) === "Fun fact loading…"
          ? PLACEHOLDER_DESCRIPTION
          : getAiFact(country),
      )
    : PLACEHOLDER_DESCRIPTION;
  const displayName = country?.name ?? "Peru";

  return (
    <View className="overflow-hidden rounded-3xl">
      {heroUri ? (
        <Image
          source={{ uri: heroUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={`${displayName} landscape`}
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, styles.fallbackHero]}
        />
      )}

      <View style={styles.overlay} />

      <View className="min-h-[360px] justify-between gap-6 p-5">
        <View className="gap-3">
          <Text className="font-semibold text-[11px] tracking-widest text-tab-active">
            ✨ COUNTRY OF THE DAY
          </Text>

          <View className="flex-row items-center gap-3">
            {country ? (
              <FlagBadge
                flag={country.flag}
                iso2={country.cca2}
                width={40}
                height={28}
              />
            ) : null}
            <Text className="font-bold text-[28px] text-white">
              {displayName}
            </Text>
          </View>

          <Text className="body-md leading-snug text-white/85" numberOfLines={2}>
            {description}
          </Text>

          {country ? (
            <View className="flex-row flex-wrap gap-x-6 gap-y-2">
              <StatItem
                icon="people-outline"
                label={formatPopulation(country.population)}
              />
              <StatItem icon="location-outline" label={country.capital} />
              <StatItem icon="globe-outline" label={country.region} />
            </View>
          ) : null}
        </View>

        <View className="flex-row items-end justify-between gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Explore ${displayName}`}
            onPress={() => {
              if (country) openCountryInExplore(country);
            }}
            disabled={!country}
            className="min-h-[44px] flex-row items-center gap-2 rounded-full bg-tab-active px-5 py-3"
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <Text className="font-semibold text-sm text-midnight-navy">
              Explore {displayName} →
            </Text>
          </Pressable>

          {country ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isSaved ? "Remove from saved" : "Love this place"
              }
              onPress={() => toggleSaved(country)}
              className="min-h-[44px] flex-row items-center gap-1 rounded-full bg-black/40 px-3 py-2"
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <Text className="text-sm">{isSaved ? "❤️" : "🤍"}</Text>
              <Text className="font-medium text-xs text-white">
                12.4K Love this place
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function StatItem({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.9)" />
      <Text className="font-medium text-sm text-white">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackHero: {
    backgroundColor: "#0b132b",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
});
