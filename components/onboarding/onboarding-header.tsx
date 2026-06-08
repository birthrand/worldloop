import { StyleSheet, Text, View } from "react-native";

import {
  ONBOARDING_COLORS,
  ONBOARDING_TYPOGRAPHY,
} from "@/constants/onboarding-theme";

export function OnboardingHeader() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>WorldLoop</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: ONBOARDING_COLORS.textPrimary,
    fontFamily: "Poppins-SemiBold",
    fontSize: ONBOARDING_TYPOGRAPHY.brand.fontSize,
    lineHeight: ONBOARDING_TYPOGRAPHY.brand.lineHeight,
    letterSpacing: ONBOARDING_TYPOGRAPHY.brand.letterSpacing,
  },
  globe: {
    marginHorizontal: 1,
    marginTop: 2,
  },
});
