import { StyleSheet, Text, View } from "react-native";

import { SIGN_UP_COLORS, SIGN_UP_TYPOGRAPHY } from "@/constants/sign-up-theme";

type SignUpOrDividerProps = {
  label?: string;
};

export function SignUpOrDivider({ label = "Or" }: SignUpOrDividerProps) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: SIGN_UP_COLORS.dividerLine,
  },
  label: {
    color: SIGN_UP_COLORS.sheetTextMuted,
    fontFamily: "Poppins-Medium",
    fontSize: SIGN_UP_TYPOGRAPHY.divider.fontSize,
    lineHeight: SIGN_UP_TYPOGRAPHY.divider.lineHeight,
    letterSpacing: 0.4,
  },
});
