import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { ONBOARDING_COLORS } from "@/constants/onboarding-theme";

export function OnboardingHeadlineDivider() {
  return (
    <View
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View style={styles.line} />
      <View style={styles.iconWrap}>
        <Ionicons name="earth" size={14} color={ONBOARDING_COLORS.gold} />
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 280,
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(251, 191, 36, 0.45)",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
