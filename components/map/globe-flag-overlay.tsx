import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { GlobePinScreenPosition } from "@/components/map/globe-pin-projector";
import { resolveFlagCdnUrl } from "@/lib/flag-url";
import { cca2FromFlagUrl } from "@/lib/map-country";
import { MARKER_DEEMPHASIZED_OPACITY } from "@/lib/map-region-markers";
import type { MapCountry } from "@/types/country";

type GlobeFlagOverlayProps = {
  countries: MapCountry[];
  positions: GlobePinScreenPosition[];
  selectedName: string | null;
  focusTransitionName?: string | null;
  onCountryPress: (country: MapCountry) => void;
};

const PIN_SIZE = 36;
const SELECTED_PIN_SIZE = 30;

type GlobeFlagItemProps = {
  country: MapCountry;
  position: GlobePinScreenPosition;
  selected: boolean;
  deemphasized: boolean;
  onPress: () => void;
};

const GlobeFlagItem = memo(function GlobeFlagItem({
  country,
  position,
  selected,
  deemphasized,
  onPress,
}: GlobeFlagItemProps) {
  const flagUri = resolveFlagCdnUrl(
    country.flag,
    cca2FromFlagUrl(country.flag),
  );
  if (!flagUri) return null;

  const pinSize = selected ? SELECTED_PIN_SIZE : PIN_SIZE;
  const anchor = pinSize / 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={country.name}
      onPress={onPress}
      style={[
        styles.item,
        {
          left: position.x - anchor,
          top: position.y - anchor,
          opacity: deemphasized ? MARKER_DEEMPHASIZED_OPACITY : 1,
        },
      ]}
    >
      <View
        style={[
          styles.pin,
          selected ? styles.pinSelected : null,
          { width: pinSize, height: pinSize, borderRadius: pinSize / 2 },
        ]}
      >
        <Image
          source={{ uri: flagUri }}
          recyclingKey={flagUri}
          cachePolicy="memory-disk"
          style={[
            styles.flag,
            {
              width: selected ? SELECTED_PIN_SIZE - 4 : PIN_SIZE,
              height: selected ? SELECTED_PIN_SIZE - 4 : PIN_SIZE,
              borderRadius: selected
                ? (SELECTED_PIN_SIZE - 4) / 2
                : PIN_SIZE / 2,
            },
          ]}
          contentFit="cover"
        />
      </View>
    </Pressable>
  );
});

/** Screen-space flag pins for nearby countries when a country is selected on the globe. */
export function GlobeFlagOverlay({
  countries,
  positions,
  selectedName,
  focusTransitionName = null,
  onCountryPress,
}: GlobeFlagOverlayProps) {
  const positionByName = useMemo(
    () => new Map(positions.map((position) => [position.name, position])),
    [positions],
  );
  const focusCountryName = selectedName ?? focusTransitionName ?? null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {countries.map((country) => {
        const position = positionByName.get(country.name);
        if (!position?.visible) return null;

        const isSelected = focusCountryName === country.name;
        const isFocusTransitioning =
          !!focusTransitionName &&
          focusTransitionName === country.name &&
          selectedName !== country.name;

        return (
          <GlobeFlagItem
            key={country.name}
            country={country}
            position={position}
            selected={isSelected || isFocusTransitioning}
            deemphasized={
              !!focusCountryName && !isSelected && !isFocusTransitioning
            }
            onPress={() => onCountryPress(country)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  item: {
    position: "absolute",
  },
  pin: {
    backgroundColor: "#1a1f2e",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pinSelected: {
    borderWidth: 2,
    borderColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 6,
  },
  flag: {
    borderRadius: PIN_SIZE / 2,
  },
});
