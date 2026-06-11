import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SIGN_UP_COLORS,
  SIGN_UP_TAB_HEIGHT,
  SIGN_UP_TAB_TRACK_HEIGHT,
  SIGN_UP_TAB_TRACK_PADDING,
  SIGN_UP_TYPOGRAPHY,
} from "@/constants/sign-up-theme";
import type { AuthTab } from "@/types/auth";

type SignUpAuthTabsProps = {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
};

export function SignUpAuthTabs({
  activeTab,
  onTabChange,
}: SignUpAuthTabsProps) {
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
    height: SIGN_UP_TAB_TRACK_HEIGHT,
    backgroundColor: SIGN_UP_COLORS.tabTrack,
    borderRadius: SIGN_UP_TAB_TRACK_HEIGHT / 2,
    padding: SIGN_UP_TAB_TRACK_PADDING,
    gap: SIGN_UP_TAB_TRACK_PADDING,
  },
  tab: {
    flex: 1,
    height: SIGN_UP_TAB_HEIGHT,
    borderRadius: SIGN_UP_TAB_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: SIGN_UP_COLORS.tabActiveBg,
  },
  tabInactive: {
    backgroundColor: "transparent",
  },
  tabLabel: {
    fontSize: SIGN_UP_TYPOGRAPHY.tab.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.tab.lineHeight,
  },
  tabLabelActive: {
    color: SIGN_UP_COLORS.tabActiveText,
    fontFamily: "Poppins-SemiBold",
  },
  tabLabelInactive: {
    color: SIGN_UP_COLORS.tabInactive,
    fontFamily: "Poppins-Regular",
  },
});
