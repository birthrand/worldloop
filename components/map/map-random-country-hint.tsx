import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import type { MapCountry } from "@/types/country";

type MapRandomCountryHintProps = {
  country: MapCountry;
  bottom: number;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 4000;

export function MapRandomCountryHint({
  country,
  bottom,
  onDismiss,
}: MapRandomCountryHintProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="none">
      <View style={styles.bubble}>
        <FlagBadge flag={country.flag} width={20} height={14} />
        <Text style={styles.label} numberOfLines={1}>
          {country.name} · Tap pin for details
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 16,
    zIndex: 8,
    maxWidth: "72%",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(18, 24, 38, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  label: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins-Medium",
    color: "#ffffff",
  },
});
