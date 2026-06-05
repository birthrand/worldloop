import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { openCountryAiExplorer } from "@/lib/open-country-ai-explorer";
import type { Country } from "@/types/country";

type ExploreFooterProps = {
  country: Country;
};

export function ExploreFooter({ country }: ExploreFooterProps) {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.nameBlock}>
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open AI insights for ${country.name}`}
          accessibilityHint="Opens a detailed AI-powered country dashboard"
          onPress={() => openCountryAiExplorer(country)}
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
        >
          <Text style={styles.linkText}>AI Insights</Text>
          <Ionicons name="chevron-forward" size={16} color="#00d4c7" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countryName: {
    flex: 1,
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    color: "#ffffff",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  linkPressed: {
    opacity: 0.75,
  },
  linkText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: "#00d4c7",
  },
});
