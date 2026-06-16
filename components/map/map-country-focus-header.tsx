import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING,
  EXPLORE_SWIPE_TEXT_HEADER,
  EXPLORE_SWIPE_TOUCH_TARGET,
} from "@/constants/explore-swipe-layout";

const HEADER_ROW_HEIGHT = EXPLORE_SWIPE_TOUCH_TARGET;
const SCRIM_EXTRA_HEIGHT = 72;
const COUNTRY_NAME_FONT_SIZE = EXPLORE_SWIPE_TEXT_HEADER;
const HEADER_PADDING_TOP = 8;
const HEADER_HORIZONTAL_PADDING = EXPLORE_SWIPE_DECK_HORIZONTAL_PADDING;
const HEADER_SIDE_BUTTON_SIZE = EXPLORE_SWIPE_TOUCH_TARGET;
const HEADER_TITLE_GAP = 8;
const HEADER_SIDE_INSET =
  HEADER_HORIZONTAL_PADDING + HEADER_SIDE_BUTTON_SIZE + HEADER_TITLE_GAP;
/** Matches trailing space in country detail sticky header title wrap. */
const HEADER_TITLE_TRAILING_INSET =
  HEADER_SIDE_INSET + HEADER_HORIZONTAL_PADDING;

type MapCountryFocusHeaderProps = {
  title?: string;
  onBack: () => void;
  backAccessibilityLabel?: string;
  /** Subtle fade while the preview sheet is open. */
  dimmed?: boolean;
  /** Landmark map handoff — back button only, no title. */
  backOnly?: boolean;
};

/** Explore / country-detail handoff — back + title over a black top scrim. */
export function MapCountryFocusHeader({
  title = "",
  onBack,
  backAccessibilityLabel = "Go back",
  dimmed = false,
  backOnly = false,
}: MapCountryFocusHeaderProps) {
  const insets = useSafeAreaInsets();
  const barPaddingTop = insets.top + HEADER_PADDING_TOP;
  const scrimHeight = barPaddingTop + HEADER_ROW_HEIGHT + SCRIM_EXTRA_HEIGHT;

  return (
    <View
      style={[styles.root, dimmed && styles.dimmed]}
      pointerEvents="box-none"
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(0, 0, 0, 0.92)",
          "rgba(0, 0, 0, 0.58)",
          "rgba(0, 0, 0, 0)",
        ]}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.scrim, { height: scrimHeight }]}
      />

      <View
        pointerEvents="box-none"
        style={[styles.bar, { paddingTop: barPaddingTop }]}
      >
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            onPress={onBack}
            style={({ pressed }) => [
              styles.backSlot,
              pressed && styles.backSlotPressed,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={EXPLORE_SWIPE_CARD_TITLE_COLOR}
            />
          </Pressable>

          {backOnly ? (
            <View style={styles.titleSpacer} />
          ) : (
            <>
              <View style={styles.titleWrap}>
                <Text
                  style={styles.title}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
              </View>

              <View style={styles.titleTrailingInset} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  dimmed: {
    opacity: 0.72,
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: HEADER_ROW_HEIGHT,
    paddingHorizontal: HEADER_HORIZONTAL_PADDING,
    gap: HEADER_TITLE_GAP,
  },
  backSlot: {
    width: HEADER_SIDE_BUTTON_SIZE,
    height: HEADER_SIDE_BUTTON_SIZE,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  backSlotPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  titleSpacer: {
    flex: 1,
    minWidth: 0,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    height: HEADER_ROW_HEIGHT,
    justifyContent: "center",
  },
  titleTrailingInset: {
    width: HEADER_TITLE_TRAILING_INSET,
    flexShrink: 0,
  },
  title: {
    width: "100%",
    maxWidth: "100%",
    fontFamily: "Poppins-SemiBold",
    fontSize: COUNTRY_NAME_FONT_SIZE,
    lineHeight: HEADER_ROW_HEIGHT,
    letterSpacing: -0.2,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
