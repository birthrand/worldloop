import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import { cca3FromFlagUrl } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

type MapCountryFocusPillProps = {
  country: MapCountry;
  bottom: number;
  onOpenDetails: () => void;
  onDismiss: () => void;
};

const PILL_HEIGHT = 44;

export function MapCountryFocusPill({
  country,
  bottom,
  onOpenDetails,
  onDismiss,
}: MapCountryFocusPillProps) {
  const handleOpenDetails = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenDetails();
  };

  const handleDismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  const countryCode = cca3FromFlagUrl(country.flag);

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open details for ${country.name}`}
          onPress={handleOpenDetails}
          style={({ pressed }) => [
            styles.detailsSegment,
            pressed && styles.pressed,
          ]}
        >
          <FlagBadge flag={country.flag} width={22} height={15} />
          <Text style={styles.countryLabel} numberOfLines={1}>
            {countryCode}
          </Text>
          <Text style={styles.detailsLabel}>Details</Text>
          <Ionicons name="arrow-forward" size={14} color="#fbbf24" />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Clear focus on ${country.name}`}
          onPress={handleDismiss}
          hitSlop={6}
          style={({ pressed }) => [
            styles.dismissSegment,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="close" size={18} color="#94a3b8" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 7,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  detailsSegment: {
    flexDirection: "row",
    alignItems: "center",
    height: PILL_HEIGHT,
    gap: 6,
    paddingLeft: 14,
    paddingRight: 12,
  },
  dismissSegment: {
    width: PILL_HEIGHT,
    height: PILL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: 1,
    height: PILL_HEIGHT,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  countryLabel: {
    minWidth: 28,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
    textAlign: "left",
  },
  detailsLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Medium",
    color: "#fbbf24",
  },
  pressed: {
    opacity: 0.95,
    backgroundColor: "#29303C",
  },
});
