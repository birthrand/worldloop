import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { openCountryAiExplorer } from "@/lib/open-country-ai-explorer";
import type { Country } from "@/types/country";

type ExploreFooterProps = {
  country: Country;
};

export function ExploreFooter({ country }: ExploreFooterProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open AI country explorer for ${country.name}`}
      accessibilityHint="Opens a detailed AI-powered country profile"
      onPress={() => openCountryAiExplorer(country)}
      style={({ pressed }) => [styles.root, pressed && styles.rootPressed]}
    >
      <View style={styles.row}>
        <FlagBadge
          flag={country.flag}
          iso2={country.cca2}
          width={36}
          height={24}
        />
        <Text
          style={styles.countryName}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={15 / 18}
          ellipsizeMode="tail"
        >
          {country.name}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  rootPressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },
  countryName: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    color: "#ffffff",
  },
});
