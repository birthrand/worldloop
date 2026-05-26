import { Entypo, Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_BG = "#0b132b";
const TAB_ACTIVE = "#fbbf24";
const TAB_INACTIVE = "#94a3b8";

type IoniconsName = keyof typeof Ionicons.glyphMap;
type EntypoName = keyof typeof Entypo.glyphMap;

type RegularTabItem = {
  routeName: string;
  label: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
};

type CenterTabItem = {
  routeName: string;
  icon: EntypoName;
  iconFocused: EntypoName;
  isCenter: true;
};

type TabItem = RegularTabItem | CenterTabItem;

const TAB_ITEMS: TabItem[] = [
  {
    routeName: "index",
    label: "Home",
    icon: "home-outline",
    iconFocused: "home",
  },
  {
    routeName: "explore",
    label: "Explore",
    icon: "compass-outline",
    iconFocused: "compass",
  },
  {
    routeName: "map",
    icon: "globe",
    iconFocused: "globe",
    isCenter: true,
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
    <View style={[styles.shell, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {TAB_ITEMS.map((item) => {
          const route = state.routes.find((r) => r.name === item.routeName);
          if (!route) return null;

          const routeIndex = state.routes.indexOf(route);
          const isFocused = state.index === routeIndex;
          const color = isFocused ? TAB_ACTIVE : TAB_INACTIVE;

          const onPress = () => handlePress(route, isFocused);

          if ("isCenter" in item) {
            return (
              <Pressable
                key={item.routeName}
                accessibilityRole="button"
                accessibilityLabel="Map"
                accessibilityState={{ selected: isFocused }}
                onPress={onPress}
                style={styles.centerSlot}
              >
                <View
                  style={[styles.centerButton, isFocused && styles.focusedGlow]}
                >
                  <Entypo
                    name={isFocused ? item.iconFocused : item.icon}
                    size={36}
                    color={isFocused ? "#fbbf24" : "rgba(255, 255, 255, 0.9)"}
                  />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={item.routeName}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isFocused }}
              onPress={onPress}
              style={styles.tab}
            >
              <Ionicons
                name={isFocused ? item.iconFocused : item.icon}
                size={24}
                color={color}
              />
              {item.label ? (
                <Text style={[styles.label, { color }]}>{item.label}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: TAB_BAR_BG,
    overflow: "visible",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: TAB_BAR_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 4,
    // paddingBottom: 6,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 40,
    paddingBottom: 0,
  },
  label: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
  },
  focusedGlow: {
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.5)",
    shadowColor: TAB_ACTIVE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a2332",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
});
