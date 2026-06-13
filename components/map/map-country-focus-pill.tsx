import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import {
  EXPLORE_SWIPE_ACCENT_COLOR,
  EXPLORE_SWIPE_CARD_BORDER,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
  EXPLORE_SWIPE_TEXT_EMPHASIS,
} from "@/constants/explore-swipe-layout";
import { cca2FromFlagUrl, cca3FromFlagUrl } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

/** Matches map layout chrome height in `app/(tabs)/map.tsx`. */
export const MAP_COUNTRY_FOCUS_PILL_HEIGHT = 44;

const FLAG_WIDTH = 32;
const FLAG_HEIGHT = 22;
/** Outer inset from pill edge — matches explore deck horizontal padding. */
const PILL_PADDING_HORIZONTAL = EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING;
/** Space between flag block and the divider. */
const PILL_IDENTITY_TRAILING = 10;

type MapCountryFocusPillProps = {
  country: MapCountry;
  bottom: number;
  onOpenDetails: () => void;
};

export function MapCountryFocusPill({
  country,
  bottom,
  onOpenDetails,
}: MapCountryFocusPillProps) {
  const handleOpenDetails = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenDetails();
  };

  const countryCode = cca3FromFlagUrl(country.flag);

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${country.name}`}
        onPress={handleOpenDetails}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <View style={styles.detailsIdentity}>
          <FlagBadge
            flag={country.flag}
            iso2={cca2FromFlagUrl(country.flag)}
            width={FLAG_WIDTH}
            height={FLAG_HEIGHT}
          />
          <Text style={styles.countryCode} numberOfLines={1}>
            {countryCode}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailsAction}>
          <Text style={styles.detailsLabel}>Details</Text>
        </View>
      </Pressable>
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
    height: MAP_COUNTRY_FOCUS_PILL_HEIGHT,
    borderRadius: MAP_COUNTRY_FOCUS_PILL_HEIGHT / 2,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: 1,
    borderColor: EXPLORE_SWIPE_CARD_BORDER,
    overflow: "hidden",
  },
  detailsIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: PILL_PADDING_HORIZONTAL,
    paddingRight: PILL_IDENTITY_TRAILING,
  },
  detailsAction: {
    height: MAP_COUNTRY_FOCUS_PILL_HEIGHT,
    paddingHorizontal: PILL_PADDING_HORIZONTAL,
    justifyContent: "center",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: MAP_COUNTRY_FOCUS_PILL_HEIGHT * 0.6,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  countryCode: {
    minWidth: 32,
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_TEXT_EMPHASIS,
    lineHeight: EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
    letterSpacing: 0.4,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  detailsLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    lineHeight: EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
    color: EXPLORE_SWIPE_ACCENT_COLOR,
  },
  pressed: {
    opacity: 0.88,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
});
