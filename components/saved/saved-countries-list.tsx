import { Image } from "expo-image";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { continentDisplayLabel } from "@/constants/regions";
import { getCountryImages } from "@/lib/format-country";
import {
  openCountryDetail,
  warmCountryDetail,
} from "@/lib/open-country-detail";
import type { Country } from "@/types/country";

type SavedCountriesListProps = {
  countries: Country[];
};

const CARD_GAP = 12;
const NUM_COLUMNS = 2;

export function SavedCountriesList({ countries }: SavedCountriesListProps) {
  return (
    <FlatList
      data={countries}
      keyExtractor={(item) => item.name}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => <SavedCountryCard country={item} />}
    />
  );
}

function SavedCountryCard({ country }: { country: Country }) {
  const images = getCountryImages(country);
  const heroUri = images[0];
  const regionLabel = continentDisplayLabel(country.region?.trim() || "—");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${country.name}`}
      onPressIn={() => warmCountryDetail(country)}
      onPress={() => openCountryDetail(country, { from: "saved" })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {heroUri ? (
        <Image
          source={{ uri: heroUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cardFallback]} />
      )}
      <View style={styles.cardOverlay} />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <FlagBadge
            flag={country.flag}
            iso2={country.cca2}
            width={28}
            height={18}
          />
          <Text style={styles.cardTitle} numberOfLines={2}>
            {country.name}
          </Text>
        </View>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {regionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
    gap: CARD_GAP,
  },
  row: {
    gap: CARD_GAP,
  },
  card: {
    flex: 1,
    minHeight: 168,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1c2541",
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardFallback: {
    backgroundColor: "#1c2541",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  cardBody: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 4,
    padding: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255, 255, 255, 0.62)",
  },
});
