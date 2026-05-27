import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { getCountryImages } from "@/lib/format-country";
import { openCountryInExplore } from "@/lib/open-country-in-explore";
import type { Country } from "@/types/country";

type TrendingCountriesSectionProps = {
  countries: Country[];
  loading?: boolean;
};

const CARD_WIDTH = 136;
const CARD_HEIGHT = 188;

export function TrendingCountriesSection({
  countries,
  loading = false,
}: TrendingCountriesSectionProps) {
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-lg text-white">
          Trending Countries
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all trending countries"
          onPress={() => {}}
        >
          <Text className="font-semibold text-sm text-tab-active">
            View All &gt;
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="h-[188px] items-center justify-center">
          <ActivityIndicator color="#fbbf24" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {countries.map((country) => (
            <TrendingCountryCard key={country.name} country={country} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function TrendingCountryCard({ country }: { country: Country }) {
  const images = getCountryImages(country);
  const heroUri = images[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Trending ${country.name}`}
      onPress={() => openCountryInExplore(country)}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      {heroUri ? (
        <Image
          source={{ uri: heroUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View style={StyleSheet.absoluteFill} className="bg-midnight-navy" />
      )}
      <View style={styles.cardOverlay} />
      <View className="flex-1 justify-end gap-1 p-3">
        <View className="flex-row items-center gap-2">
          <FlagBadge
            flag={country.flag}
            iso2={country.cca2}
            width={28}
            height={18}
          />
          <Text
            className="min-w-0 flex-1 font-semibold text-sm text-white"
            numberOfLines={1}
          >
            {country.name}
          </Text>
        </View>
        {/* <Text className="text-xs text-tab-active">🔥 Trending</Text> */}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
});
