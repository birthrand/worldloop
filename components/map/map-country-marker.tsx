import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";

import { resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

type MapCountryMarkerProps = {
  country: MapCountry;
  selected: boolean;
  onPress: () => void;
};

export function MapCountryMarker({
  country,
  selected,
  onPress,
}: MapCountryMarkerProps) {
  const [latitude, longitude] = country.latlng;
  const flagUri = resolveFlagCdnUrl(country.flag, cca2FromFlagUrl(country.flag));

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      tracksViewChanges={selected}
    >
      <View style={styles.wrapper} pointerEvents="box-none">
        <View style={[styles.pin, selected && styles.pinSelected]}>
          {flagUri ? (
            <Image
              source={{ uri: flagUri }}
              style={styles.flag}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.flagEmoji}>🏳️</Text>
          )}
        </View>
        <View style={styles.labelRow}>
          <Text style={styles.countryName} numberOfLines={1}>
            {country.name}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    maxWidth: 120,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "#1a1f2e",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pinSelected: {
    borderColor: "#fbbf24",
    borderWidth: 3,
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  flag: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  flagEmoji: {
    fontSize: 20,
  },
  labelRow: {
    marginTop: 4,
    alignItems: "center",
    gap: 2,
  },
  countryName: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
