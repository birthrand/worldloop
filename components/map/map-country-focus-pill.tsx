import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FlagBadge } from "@/components/explore/flag-badge";
import {
  EXPLORE_SWIPE_CARD_BORDER,
  EXPLORE_SWIPE_CARD_INFO_BG,
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_TEXT_BODY,
  EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT,
} from "@/constants/explore-swipe-layout";
import { continentDisplayLabel } from "@/constants/regions";
import { cca2FromFlagUrl, cca3FromFlagUrl } from "@/lib/map-country";
import type { MapCountry } from "@/types/country";

/** Matches map layout chrome height in `app/(tabs)/map.tsx`. */
export const MAP_COUNTRY_FOCUS_PILL_HEIGHT = 44;

const FLAG_WIDTH = 32;
const FLAG_HEIGHT = 22;
/** Shared text metrics so country code + region sit on one horizontal line. */
const PILL_TEXT_LINE_HEIGHT = EXPLORE_SWIPE_TEXT_BODY_LINE_HEIGHT;
/** Outer inset from pill edge — matches explore deck horizontal padding. */
const PILL_PADDING_HORIZONTAL = EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING;
/** Space between flag block and the divider. */
const PILL_FLAG_TRAILING = 8;
const PILL_CODE_TRAILING = 10;
const PILL_REGION_LEADING = 10;

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
  const regionLabel = continentDisplayLabel(country.region?.trim() || "—");

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${country.name}`}
        onPress={handleOpenDetails}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <FlagBadge
          flag={country.flag}
          iso2={cca2FromFlagUrl(country.flag)}
          width={FLAG_WIDTH}
          height={FLAG_HEIGHT}
        />
        <Text style={styles.countryCode} numberOfLines={1}>
          {countryCode}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.regionLabel} numberOfLines={1}>
          {regionLabel}
        </Text>
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
    paddingLeft: PILL_PADDING_HORIZONTAL,
    paddingRight: PILL_PADDING_HORIZONTAL,
    borderRadius: MAP_COUNTRY_FOCUS_PILL_HEIGHT / 2,
    backgroundColor: EXPLORE_SWIPE_CARD_INFO_BG,
    borderWidth: 1,
    borderColor: EXPLORE_SWIPE_CARD_BORDER,
    overflow: "hidden",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginVertical: MAP_COUNTRY_FOCUS_PILL_HEIGHT * 0.2,
    marginLeft: PILL_CODE_TRAILING,
    marginRight: PILL_REGION_LEADING,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  countryCode: {
    minWidth: 32,
    marginLeft: PILL_FLAG_TRAILING,
    fontFamily: "Poppins-SemiBold",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    lineHeight: PILL_TEXT_LINE_HEIGHT,
    letterSpacing: 0.4,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  regionLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: EXPLORE_SWIPE_TEXT_BODY,
    lineHeight: PILL_TEXT_LINE_HEIGHT,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  pressed: {
    opacity: 0.88,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
});
