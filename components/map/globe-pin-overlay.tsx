import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl } from "@/lib/map-country";
import type { CountryMarkerDisplayMode } from "@/store/use-map-ui-store";
import type { MapCountry } from "@/types/country";

export type GlobePinScreenPosition = {
  name: string;
  x: number;
  y: number;
  visible: boolean;
};

type GlobePinOverlayProps = {
  countries: MapCountry[];
  positions: GlobePinScreenPosition[];
  displayMode: CountryMarkerDisplayMode;
  selectedName: string | null;
  onCountryPress: (country: MapCountry) => void;
};

export function GlobePinOverlay({
  countries,
  positions,
  displayMode,
  selectedName,
  onCountryPress,
}: GlobePinOverlayProps) {
  if (displayMode === "hidden") return null;

  const showFlag = displayMode === "flag";

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {positions.map((pos) => {
        if (!pos.visible) return null;

        const country = countries.find((c) => c.name === pos.name);
        if (!country) return null;

        const selected = selectedName === country.name;
        const flagUri = resolveFlagCdnUrl(
          country.flag,
          cca2FromFlagUrl(country.flag),
        );

        return (
          <Pressable
            key={country.name}
            accessibilityRole="button"
            accessibilityLabel={country.name}
            onPress={() => onCountryPress(country)}
            style={[
              styles.pinAnchor,
              {
                left: pos.x,
                top: pos.y,
                transform: [{ translateX: -20 }, { translateY: -20 }],
              },
            ]}
          >
            <View style={styles.wrapper} pointerEvents="box-none">
              <View style={[styles.pin, selected && styles.pinSelected]}>
                {showFlag ? (
                  flagUri ? (
                    <Image
                      source={{ uri: flagUri }}
                      style={styles.flag}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={styles.flagEmoji}>🏳️</Text>
                  )
                ) : (
                  <View style={styles.dot} />
                )}
              </View>
              {/* <View style={styles.labelRow}>
                <Text style={styles.countryName} numberOfLines={1}>
                  {country.name}
                </Text>
              </View> */}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pinAnchor: {
    position: "absolute",
    width: 40,
    alignItems: "center",
  },
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
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ffffff",
  },
  labelRow: {
    marginTop: 4,
    alignItems: "center",
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
