import { Ionicons } from "@expo/vector-icons";
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useContext } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SPACE_TAB_BAR_BG } from "@/constants/space-theme";

const TAB_ACTIVE = "#fbbf24";
const TAB_INACTIVE = "rgba(148, 163, 184, 0.82)";
const TAB_ACTIVE_ICON_SIZE = 26;
const TAB_INACTIVE_ICON_SIZE = 24;

/** Bar chrome only — add safe-area bottom inset for full tab bar height. */
export const TAB_BAR_CONTENT_HEIGHT = 54;

/** Floating explore UI clearance above the tab bar (card fact block + padding). */
export const EXPLORE_FLOATING_CHROME_OFFSET = 94;

type IoniconsName = keyof typeof Ionicons.glyphMap;

type TabItem = {
  routeName: string;
  label: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
};

const TAB_ITEMS: TabItem[] = [
  {
    routeName: "explore",
    label: "Explore",
    icon: "compass-outline",
    iconFocused: "compass",
  },
  {
    routeName: "culture",
    label: "Culture",
    icon: "film-outline",
    iconFocused: "film",
  },
  {
    routeName: "map",
    label: "Map",
    icon: "globe-outline",
    iconFocused: "globe",
  },
  {
    routeName: "saved",
    label: "Saved",
    icon: "bookmark-outline",
    iconFocused: "bookmark",
  },
  {
    routeName: "profile",
    label: "Profile",
    icon: "person-outline",
    iconFocused: "person",
  },
];

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const onTabBarHeightChange = useContext(BottomTabBarHeightCallbackContext);

  const handlePress = (
    route: (typeof state.routes)[number],
    isFocused: boolean,
  ) => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View
      style={[styles.shell, { paddingBottom: insets.bottom }]}
      onLayout={(event) => {
        onTabBarHeightChange?.(event.nativeEvent.layout.height);
      }}
    >
      <View style={styles.bar}>
        {TAB_ITEMS.map((item) => {
          const route = state.routes.find((r) => r.name === item.routeName);
          if (!route) return null;

          const routeIndex = state.routes.indexOf(route);
          const isFocused = state.index === routeIndex;
          const color = isFocused ? TAB_ACTIVE : TAB_INACTIVE;

          return (
            <Pressable
              key={item.routeName}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isFocused }}
              onPress={() => handlePress(route, isFocused)}
              style={styles.tab}
            >
              <Ionicons
                name={isFocused ? item.iconFocused : item.icon}
                size={isFocused ? TAB_ACTIVE_ICON_SIZE : TAB_INACTIVE_ICON_SIZE}
                color={color}
              />
              <Text
                style={[
                  styles.label,
                  isFocused ? styles.labelActive : styles.labelInactive,
                  { color },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TAB_BAR_BORDER = "rgba(148, 163, 184, 0.24)";

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    backgroundColor: SPACE_TAB_BAR_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TAB_BAR_BORDER,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: SPACE_TAB_BAR_BG,
    paddingTop: 8,
    paddingBottom: 2,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 44,
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
  },
  labelActive: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 11,
  },
  labelInactive: {
    fontFamily: "Poppins-Medium",
  },
});
