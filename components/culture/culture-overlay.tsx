import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TAB_BAR_CONTENT_HEIGHT } from "@/components/bottom-tab-bar";
import { ExploreActionRail } from "@/components/explore/explore-action-rail";
import { FlagBadge } from "@/components/explore/flag-badge";
import { continentDisplayLabel } from "@/constants/regions";
import { formatPopulation, getAiFact } from "@/lib/format-country";
import {
  openCountryAiExplorer,
  warmCountryAiExplorer,
} from "@/lib/open-country-ai-explorer";
import type { Country } from "@/types/country";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Negative offset lets the card sit into the tab bar chrome (TikTok-style). */
const CULTURE_OVERLAY_TAB_CLEARANCE = -70;
/** Action rail sits above the country card. */
const CULTURE_ACTION_RAIL_CLEARANCE = -16;
/** Bottom band only — keeps the hero video bright. */
const BOTTOM_SCRIM_HEIGHT = "38%";

type CultureOverlayProps = {
  country: Country;
};

export function CultureOverlay({ country }: CultureOverlayProps) {
  const insets = useSafeAreaInsets();
  const [isFactExpanded, setIsFactExpanded] = useState(false);
  const region = continentDisplayLabel(country.region?.trim() || "—");
  const fact = getAiFact(country);
  const bottomOffset =
    TAB_BAR_CONTENT_HEIGHT + insets.bottom + CULTURE_OVERLAY_TAB_CLEARANCE;

  useEffect(() => {
    setIsFactExpanded(false);
  }, [country.name]);

  return (
    <View
      style={[styles.root, { paddingBottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.22)", "rgba(0, 0, 0, 0.48)"]}
        locations={[0, 0.55, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />

      {isFactExpanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close expanded fact"
          onPress={() => setIsFactExpanded(false)}
          style={styles.expandedScrim}
        />
      ) : null}

      <View style={styles.content} pointerEvents="box-none">
        <View style={styles.infoBlock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${country.name} profile`}
            onPressIn={() => warmCountryAiExplorer(country)}
            onPress={() => openCountryAiExplorer(country)}
            style={({ pressed }) => [
              styles.titlePressable,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.titleRow}>
              <FlagBadge
                flag={country.flag}
                iso2={country.cca2}
                width={28}
                height={28}
                circular
              />
              <View style={styles.titleText}>
                <Text style={styles.countryName} numberOfLines={1}>
                  {country.name}
                </Text>
              </View>
            </View>
          </Pressable>

          {isFactExpanded ? (
            <View style={styles.expandedDetails}>
              <Text style={styles.meta} numberOfLines={1}>
                {region} · {formatPopulation(country.population)}
              </Text>
              <Text style={styles.fact} numberOfLines={3}>
                {fact}
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Expand country fact"
              accessibilityHint="Shows the full fact over a dimmed background"
              onPress={() => setIsFactExpanded(true)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={styles.fact} numberOfLines={1} ellipsizeMode="tail">
                {fact}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ExploreActionRail
        country={country}
        variant="culture"
        floatingChromeOffset={CULTURE_ACTION_RAIL_CLEARANCE}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_SCRIM_HEIGHT,
  },
  expandedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    zIndex: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 16,
    paddingRight: 64,
    zIndex: 6,
  },
  infoBlock: {
    flex: 1,
    gap: 10,
  },
  titlePressable: {
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.92,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleText: {
    flex: 1,
    justifyContent: "center",
  },
  countryName: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: "Poppins-Regular",
    color: "#ffffff",
    includeFontPadding: false,
  },
  expandedDetails: {
    gap: 6,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.78)",
  },
  fact: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.92)",
  },
});
