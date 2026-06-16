import { StyleSheet, Text, View } from "react-native";

import {
  EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
} from "@/constants/explore-swipe-layout";

type StatItemProps = {
  label: string;
  value: string;
  align?: "center" | "start";
  compact?: boolean;
  /** Profile explorer tile — value-first hierarchy. */
  tile?: boolean;
  /** Grow to fill a flex row (stats panel). Off for wrapped geography grids. */
  fill?: boolean;
};

export function StatItem({
  label,
  value,
  align = "center",
  compact = false,
  tile = false,
  fill = true,
}: StatItemProps) {
  return (
    <View
      style={[
        styles.root,
        compact && styles.rootCompact,
        tile && styles.rootTile,
        align === "start" && styles.rootStart,
        !fill && styles.rootNoFill,
      ]}
    >
      <Text
        style={[
          styles.value,
          compact && styles.valueCompact,
          tile && styles.valueTile,
        ]}
        numberOfLines={tile ? 2 : 1}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          tile && styles.labelTile,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  rootCompact: {
    gap: 1,
    justifyContent: "center",
  },
  rootTile: {
    gap: 3,
    paddingVertical: 2,
    justifyContent: "center",
  },
  rootStart: {
    alignItems: "flex-start",
  },
  rootNoFill: {
    flex: 0,
    alignSelf: "stretch",
    width: "100%",
  },
  value: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
  valueCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  valueTile: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    lineHeight: 17,
  },
  label: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
  labelCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  labelTile: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: EXPLORE_SWIPE_CARD_SUBTITLE_COLOR,
  },
});
