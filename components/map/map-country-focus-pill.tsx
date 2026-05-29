import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import type { MapCountry } from "@/types/country";

type MapCountryFocusPillProps = {
  country: MapCountry;
  bottom: number;
  onOpenDetails: () => void;
  onDismiss?: () => void;
};

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
    onDismiss?.();
  };

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.stack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open details for ${country.name}`}
          onPress={handleOpenDetails}
          style={({ pressed }) => [
            styles.segment,
            styles.detailsSegment,
            pressed && styles.pressed,
          ]}
        >
          <FlagBadge flag={country.flag} width={22} height={15} />
          <Text style={styles.countryLabel} numberOfLines={1}>
            {country.name}
          </Text>
          <Text style={styles.detailsLabel}>Details</Text>
          <Ionicons name="arrow-forward" size={14} color="#fbbf24" />
        </Pressable>

        {onDismiss ? (
          <>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Clear focus on ${country.name}`}
              onPress={handleDismiss}
              hitSlop={6}
              style={({ pressed }) => [
                styles.segment,
                styles.dismissSegment,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={18} color="#94a3b8" />
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 7,
  },
  stack: {
    flexDirection: "row",
    alignItems: "stretch",
    maxWidth: "88%",
    minHeight: 44,
    borderRadius: 32,
    backgroundColor: "#101828",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  segment: {
    minHeight: 44,
    justifyContent: "center",
  },
  detailsSegment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    flexShrink: 1,
    minWidth: 0,
  },
  dismissSegment: {
    width: 44,
    alignItems: "center",
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  countryLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
  detailsLabel: {
    flexShrink: 0,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#fbbf24",
  },
  pressed: {
    opacity: 0.95,
    backgroundColor: "#29303C",
  },
});
