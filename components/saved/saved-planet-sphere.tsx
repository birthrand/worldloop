import { Image } from "expo-image";
import { Platform, StyleSheet, Text, View } from "react-native";

import { resolveFlagCdnUrl } from "@/lib/flag-url";
import type { PlanetPalette } from "@/lib/saved-space-layout";

type SavedPlanetSphereProps = {
  size: number;
  palette: PlanetPalette;
  flag: string;
  iso2?: string;
};

/**
 * Layered sphere illusion — flag centered inside the planet sphere.
 */
export function SavedPlanetSphere({
  size,
  palette,
  flag,
  iso2,
}: SavedPlanetSphereProps) {
  const radius = size / 2;
  const flagUri = resolveFlagCdnUrl(flag, iso2);
  const hasAccent = palette.glow !== "transparent";
  const glowSize = size + 10;
  const glowBleed = Math.ceil((glowSize - size) / 2) + 8;
  const shadowColor = hasAccent ? palette.core : "#000000";

  return (
    <View
      style={[
        styles.stage,
        {
          width: size,
          height: size + glowBleed * 2,
          paddingTop: glowBleed,
        },
      ]}
    >
      <View style={[styles.cluster, { width: size, height: size }]}>
        {hasAccent ? (
          <View
            style={[
              styles.atmoGlow,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                backgroundColor: palette.glow,
                marginTop: -glowSize / 2,
                marginLeft: -glowSize / 2,
              },
            ]}
          />
        ) : null}

        {hasAccent ? (
          <View
            style={[
              styles.outerRing,
              {
                width: size + 12,
                height: size + 12,
                borderRadius: (size + 12) / 2,
                borderColor: palette.ring,
                marginTop: -(size + 12) / 2,
                marginLeft: -(size + 12) / 2,
              },
            ]}
          />
        ) : null}

        <View
          style={[
            styles.planet,
            {
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: palette.core,
              ...Platform.select({
                ios: {
                  shadowColor,
                  shadowOffset: { width: 0, height: size * 0.08 },
                  shadowOpacity: hasAccent ? 0.55 : 0.28,
                  shadowRadius: size * 0.14,
                },
                android: {
                  elevation: 10,
                },
              }),
            },
          ]}
        >
          {flagUri ? (
            <Image
              source={{ uri: flagUri }}
              style={styles.flagImage}
              contentFit="cover"
              contentPosition="center"
              accessibilityLabel="Country flag"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.flagFallback]}>
              <Text style={{ fontSize: size * 0.34 }}>🏳️</Text>
            </View>
          )}

          {hasAccent ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: palette.core, opacity: 0.1 },
              ]}
            />
          ) : null}

          <View
            style={[
              styles.terminator,
              {
                width: size * 0.58,
                height: size,
                right: -size * 0.04,
                borderTopRightRadius: radius,
                borderBottomRightRadius: radius,
              },
            ]}
          />
          <View
            style={[
              styles.terminatorDeep,
              {
                width: size * 0.34,
                height: size,
                right: 0,
                borderTopRightRadius: radius,
                borderBottomRightRadius: radius,
              },
            ]}
          />

          <View
            style={[
              styles.bottomOcclusion,
              {
                width: size * 1.1,
                height: size * 0.55,
                bottom: -size * 0.12,
                borderRadius: size * 0.55,
              },
            ]}
          />

          <View
            style={[
              styles.rimLight,
              {
                width: size,
                height: size,
                borderRadius: radius,
                borderWidth: Math.max(1, size * 0.018),
              },
            ]}
          />

          <View
            style={[
              styles.specular,
              {
                width: size * 0.34,
                height: size * 0.22,
                borderRadius: size * 0.17,
                top: size * 0.14,
                left: size * 0.16,
              },
            ]}
          />
          <View
            style={[
              styles.specularCore,
              {
                width: size * 0.12,
                height: size * 0.08,
                borderRadius: size * 0.06,
                top: size * 0.2,
                left: size * 0.24,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible",
  },
  cluster: {
    alignItems: "center",
    justifyContent: "center",
  },
  atmoGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
  },
  outerRing: {
    position: "absolute",
    top: "50%",
    left: "50%",
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  planet: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  flagImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  flagFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  terminator: {
    position: "absolute",
    backgroundColor: "rgba(4, 8, 22, 0.42)",
  },
  terminatorDeep: {
    position: "absolute",
    backgroundColor: "rgba(2, 4, 14, 0.52)",
  },
  bottomOcclusion: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.36)",
  },
  rimLight: {
    position: "absolute",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderLeftColor: "rgba(255, 255, 255, 0.42)",
    borderTopColor: "rgba(255, 255, 255, 0.32)",
    borderRightColor: "rgba(255, 255, 255, 0.04)",
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  specular: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    transform: [{ rotate: "-18deg" }],
  },
  specularCore: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    transform: [{ rotate: "-18deg" }],
  },
});
