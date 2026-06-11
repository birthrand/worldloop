import { StyleSheet, Text, View } from "react-native";

import { ONBOARDING_TYPOGRAPHY } from "@/constants/onboarding-theme";

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
    color: "rgba(255, 255, 255, 0.8)",
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
