import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AUTH_COLORS,
  AUTH_TAB_HEIGHT,
  AUTH_TAB_TRACK_HEIGHT,
  AUTH_TAB_TRACK_PADDING,
  AUTH_TYPOGRAPHY,
} from "@/constants/auth-theme";
import type { AuthTab } from "@/types/auth";

type AuthTabsProps = {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
};

export function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  const handlePress = (tab: AuthTab) => {
    if (tab === activeTab) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
  };

  return (
    <View style={styles.track}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "login" }}
        onPress={() => handlePress("login")}
        style={[
          styles.tab,
          activeTab === "login" ? styles.tabActive : styles.tabInactive,
        ]}
      >
        <Text
          style={[
            styles.tabLabel,
            activeTab === "login"
              ? styles.tabLabelActive
              : styles.tabLabelInactive,
          ]}
        >
          Login
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "register" }}
        onPress={() => handlePress("register")}
        style={[
          styles.tab,
          activeTab === "register" ? styles.tabActive : styles.tabInactive,
        ]}
      >
        <Text
          style={[
            styles.tabLabel,
            activeTab === "register"
              ? styles.tabLabelActive
              : styles.tabLabelInactive,
          ]}
        >
          Register
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    height: AUTH_TAB_TRACK_HEIGHT,
    backgroundColor: AUTH_COLORS.tabTrack,
    borderRadius: AUTH_TAB_TRACK_HEIGHT / 2,
    padding: AUTH_TAB_TRACK_PADDING,
    gap: AUTH_TAB_TRACK_PADDING,
  },
  tab: {
    flex: 1,
    height: AUTH_TAB_HEIGHT,
    borderRadius: AUTH_TAB_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: AUTH_COLORS.tabActiveBg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabInactive: {
    backgroundColor: "transparent",
  },
  tabLabel: {
    fontSize: AUTH_TYPOGRAPHY.tab.fontSize,
    lineHeight: AUTH_TYPOGRAPHY.tab.lineHeight,
  },
  tabLabelActive: {
    color: AUTH_COLORS.tabActiveText,
    fontFamily: "Poppins-SemiBold",
  },
  tabLabelInactive: {
    color: AUTH_COLORS.tabInactive,
    fontFamily: "Poppins-Regular",
  },
});
