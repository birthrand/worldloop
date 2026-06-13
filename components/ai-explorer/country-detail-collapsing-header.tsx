import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  COUNTRY_DETAIL_TITLE_CROSSFADE_RANGE,
  getCountryDetailTitleCollapseThreshold,
} from "@/constants/country-detail-layout";
import {
  EXPLORE_SWIPE_CARD_TITLE_COLOR,
  EXPLORE_SWIPE_TEXT_HEADER,
} from "@/constants/explore-swipe-layout";

const COUNTRY_NAME_FONT_SIZE = EXPLORE_SWIPE_TEXT_HEADER;
const COUNTRY_NAME_MIN_FONT_SIZE = 14;

type CountryDetailCollapsingHeaderProps = {
  countryName: string;
  scrollY: SharedValue<number>;
  screenHeight: number;
  onBack: () => void;
};

export function CountryDetailCollapsingHeader({
  countryName,
  scrollY,
  screenHeight,
  onBack,
}: CountryDetailCollapsingHeaderProps) {
  const insets = useSafeAreaInsets();
  const collapseThreshold = getCountryDetailTitleCollapseThreshold(
    screenHeight,
    insets.top,
  );
  const fadeStart = Math.max(
    0,
    collapseThreshold - COUNTRY_DETAIL_TITLE_CROSSFADE_RANGE,
  );

  const headerBarStyle = useAnimatedStyle(() => {
    const backgroundOpacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity * 0.96})`,
      borderBottomColor: `rgba(255, 255, 255, ${backgroundOpacity * 0.08})`,
      borderBottomWidth:
        backgroundOpacity > 0.01 ? StyleSheet.hairlineWidth : 0,
    };
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [6, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const heroBackStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  const stickyBackStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [fadeStart, collapseThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.bar, { paddingTop: insets.top + 8 }, headerBarStyle]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={({ pressed }) => [
            styles.backSlot,
            pressed && styles.backSlotPressed,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.backLayer, heroBackStyle]}
          >
            <View style={styles.heroBackButton}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </View>
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[styles.backLayer, stickyBackStyle]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={EXPLORE_SWIPE_CARD_TITLE_COLOR}
            />
          </Animated.View>
        </Pressable>

        <Animated.View
          pointerEvents="none"
          style={[styles.titleWrap, headerTitleStyle]}
        >
          <Animated.Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={
              COUNTRY_NAME_MIN_FONT_SIZE / COUNTRY_NAME_FONT_SIZE
            }
          >
            {countryName}
          </Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: 16,
    gap: 8,
  },
  backSlot: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  backSlotPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  backLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: COUNTRY_NAME_FONT_SIZE,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: EXPLORE_SWIPE_CARD_TITLE_COLOR,
  },
});
